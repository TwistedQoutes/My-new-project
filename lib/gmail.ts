// Talking to Gmail: storing the connection, getting access tokens, and
// calling the Gmail API (https://developers.google.com/gmail/api/reference/rest).

import { db } from "./db";
import { GoogleTokenError, refreshAccessToken } from "./google";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

export type GmailAccount = {
  email: string;
  scopes: string;
  status: "ok" | "needs_reconnect";
  lastError: string | null;
  connectedAt: Date;
};

export class GmailNotConnectedError extends Error {
  constructor(message = "Gmail is not connected.") {
    super(message);
  }
}

export class GmailApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

// ---------- Stored connection ----------

export async function getGmailAccount(): Promise<GmailAccount | null> {
  const sql = await db();
  const rows = await sql`
    SELECT email, scopes, status, last_error, connected_at FROM gmail_account WHERE id = 1`;
  const row = rows[0];
  if (!row) return null;
  return {
    email: row.email,
    scopes: row.scopes,
    status: row.status === "ok" ? "ok" : "needs_reconnect",
    lastError: row.last_error,
    connectedAt: new Date(row.connected_at),
  };
}

export async function saveGmailAccount(input: {
  email: string;
  refreshToken: string;
  scopes: string;
  historyId: string | null;
}): Promise<void> {
  const sql = await db();
  await sql`
    INSERT INTO gmail_account (id, email, refresh_token, scopes, history_id, status, last_error)
    VALUES (1, ${input.email}, ${input.refreshToken}, ${input.scopes}, ${input.historyId}, 'ok', NULL)
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      refresh_token = EXCLUDED.refresh_token,
      scopes = EXCLUDED.scopes,
      history_id = EXCLUDED.history_id,
      status = 'ok',
      last_error = NULL,
      connected_at = now(),
      updated_at = now()`;
  cachedToken = null;
}

// Deletes the stored connection and returns the refresh token so the caller
// can ask Google to revoke it.
export async function deleteGmailAccount(): Promise<string | null> {
  const sql = await db();
  const rows = await sql`DELETE FROM gmail_account WHERE id = 1 RETURNING refresh_token`;
  cachedToken = null;
  return rows[0]?.refresh_token ?? null;
}

async function markNeedsReconnect(reason: string): Promise<void> {
  const sql = await db();
  await sql`
    UPDATE gmail_account
    SET status = 'needs_reconnect', last_error = ${reason}, updated_at = now()
    WHERE id = 1`;
  cachedToken = null;
}

// ---------- Access tokens ----------

// Access tokens last about an hour. We keep the current one in memory so we
// don't ask Google for a new one on every Gmail call.
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh && cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const sql = await db();
  const rows = await sql`SELECT refresh_token, status FROM gmail_account WHERE id = 1`;
  const row = rows[0];
  if (!row) throw new GmailNotConnectedError();
  if (row.status !== "ok") {
    throw new GmailNotConnectedError("Gmail needs to be reconnected.");
  }

  try {
    const token = await refreshAccessToken(row.refresh_token);
    cachedToken = { value: token.access_token, expiresAt: Date.now() + token.expires_in * 1000 };
    return token.access_token;
  } catch (error) {
    // invalid_grant means Google cancelled the connection: 7-day "Testing"
    // expiry, a Google password change, or access removed in your account.
    if (error instanceof GoogleTokenError && error.code === "invalid_grant") {
      await markNeedsReconnect("Google ended the connection (invalid_grant). Please reconnect.");
      throw new GmailNotConnectedError("Gmail needs to be reconnected.");
    }
    throw error;
  }
}

// ---------- Gmail API ----------

async function gmailRequest(path: string, accessToken: string): Promise<Response> {
  return fetch(`${GMAIL_API}/${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = data?.error?.message ?? response.statusText;
    throw new GmailApiError(`Gmail API error ${response.status}: ${message}`, response.status);
  }
  return (await response.json()) as T;
}

async function gmailGet<T>(path: string): Promise<T> {
  let response = await gmailRequest(path, await getAccessToken());
  if (response.status === 401) {
    response = await gmailRequest(path, await getAccessToken(true));
  }
  return readJson<T>(response);
}

export type GmailProfile = { emailAddress: string; historyId: string };

// Used right after connecting, before the token is saved.
export async function fetchProfile(accessToken: string): Promise<GmailProfile> {
  return readJson<GmailProfile>(await gmailRequest("profile", accessToken));
}

type GmailMessage = {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  payload?: { headers?: { name: string; value: string }[] };
};

export type EmailSummary = {
  id: string;
  threadId: string;
  fromName: string;
  fromEmail: string;
  subject: string;
  snippet: string;
  date: Date;
  unread: boolean;
};

export async function listLatestInbox(count = 20): Promise<EmailSummary[]> {
  const list = await gmailGet<{ messages?: { id: string }[] }>(
    `messages?maxResults=${count}&labelIds=INBOX`,
  );
  const ids = (list.messages ?? []).map((message) => message.id);
  const messages = await mapWithConcurrency(ids, 5, (id) =>
    gmailGet<GmailMessage>(
      `messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`,
    ),
  );
  return messages.map(toSummary);
}

function toSummary(message: GmailMessage): EmailSummary {
  const header = (name: string) =>
    message.payload?.headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ??
    "";
  const from = parseAddress(header("From"));
  return {
    id: message.id,
    threadId: message.threadId,
    fromName: from.name,
    fromEmail: from.email,
    subject: header("Subject") || "(no subject)",
    snippet: decodeEntities(message.snippet ?? ""),
    date: new Date(Number(message.internalDate ?? 0)),
    unread: message.labelIds?.includes("UNREAD") ?? false,
  };
}

// "Jane Doe <jane@example.com>" → { name: "Jane Doe", email: "jane@example.com" }
export function parseAddress(value: string): { name: string; email: string } {
  const match = value.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (match) {
    const email = match[2].trim().toLowerCase();
    return { name: match[1].trim() || email, email };
  }
  const email = value.trim().toLowerCase();
  return { name: email, email };
}

// Gmail snippets come HTML-escaped ("it&#39;s"); turn them back into text.
function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

// Runs fn over items with at most `limit` running at once, keeping order.
// Gmail rejects too many simultaneous requests from one account.
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
