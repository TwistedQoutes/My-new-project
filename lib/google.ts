// Google sign-in ("OAuth") for Gmail.
//
// Flow: you tap Connect Gmail → Google asks you to allow access → Google sends
// you back to /api/auth/google/callback with a one-time code → we swap that
// code for a long-lived "refresh token" and store it in the database. Later
// code uses the refresh token to get short-lived access tokens on demand.

export const GMAIL_MODIFY_SCOPE = "https://www.googleapis.com/auth/gmail.modify";
export const CALLBACK_PATH = "/api/auth/google/callback";
export const OAUTH_STATE_COOKIE = "ib_oauth_state";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";

export function isGoogleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function clientCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in Vercel.");
  }
  return { clientId, clientSecret };
}

// The web address this app is running at, e.g. https://my-app.vercel.app.
// APP_URL (optional Vercel variable) wins; otherwise we use the address you
// are visiting, so the start and end of the Google sign-in always match.
export function appOrigin(headers: Headers): string {
  const override = process.env.APP_URL?.trim();
  if (override) return override.replace(/\/+$/, "");
  const host = headers.get("x-forwarded-host") ?? headers.get("host") ?? "localhost:3000";
  const proto =
    headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export function buildAuthUrl(origin: string, state: string): string {
  const { clientId } = clientCredentials();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: origin + CALLBACK_PATH,
    response_type: "code",
    scope: GMAIL_MODIFY_SCOPE,
    access_type: "offline", // ask for a refresh token
    prompt: "consent", // always return a refresh token, even on reconnect
    include_granted_scopes: "true",
    state,
  });
  return `${AUTH_URL}?${params}`;
}

type TokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
};

export class GoogleTokenError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
  }
}

async function postToken(body: Record<string, string>): Promise<TokenResponse> {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code = typeof data.error === "string" ? data.error : `http_${response.status}`;
    const detail = typeof data.error_description === "string" ? data.error_description : "";
    throw new GoogleTokenError(`Google token request failed: ${code} ${detail}`.trim(), code);
  }
  return data as TokenResponse;
}

export function exchangeCode(code: string, origin: string): Promise<TokenResponse> {
  const { clientId, clientSecret } = clientCredentials();
  return postToken({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: origin + CALLBACK_PATH,
    grant_type: "authorization_code",
  });
}

export function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const { clientId, clientSecret } = clientCredentials();
  return postToken({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
  });
}

// Tells Google to cancel the token. Failures are ignored: we delete our copy
// either way, and you can also remove access at myaccount.google.com.
export async function revokeToken(token: string): Promise<void> {
  await fetch(REVOKE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token }),
    cache: "no-store",
  }).catch(() => undefined);
}
