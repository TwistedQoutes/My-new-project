// Login sessions for the dashboard.
//
// There is exactly one user (you), so there is no users table. You log in with
// DASHBOARD_PASSWORD (a Vercel environment variable). On success we give your
// browser a cookie that says "valid until <date>", signed with the password so
// nobody can forge one. Changing the password logs out every device.

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "ib_session";
export const SESSION_DAYS = 30;
export const MIN_PASSWORD_LENGTH = 12;

export type PasswordStatus = "ok" | "missing" | "too_short";

export function passwordStatus(): PasswordStatus {
  const password = process.env.DASHBOARD_PASSWORD;
  if (!password) return "missing";
  if (password.length < MIN_PASSWORD_LENGTH) return "too_short";
  return "ok";
}

function configuredPassword(): string | null {
  return passwordStatus() === "ok" ? process.env.DASHBOARD_PASSWORD! : null;
}

// Compares two strings without leaking how many characters matched.
function safeEqual(a: string, b: string): boolean {
  const hashA = createHash("sha256").update(a).digest();
  const hashB = createHash("sha256").update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

function sign(expiresAtMs: number, password: string): string {
  return createHmac("sha256", password)
    .update(`inboxbouncer-session:v1:${expiresAtMs}`)
    .digest("base64url");
}

export function checkPassword(attempt: string): boolean {
  const password = configuredPassword();
  if (!password) return false;
  return safeEqual(attempt, password);
}

export function createSessionToken(): { value: string; expires: Date } {
  const password = configuredPassword();
  if (!password) throw new Error("DASHBOARD_PASSWORD is not set up");
  const expiresAtMs = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  return {
    value: `${expiresAtMs}.${sign(expiresAtMs, password)}`,
    expires: new Date(expiresAtMs),
  };
}

export function isValidSessionToken(token: string | undefined): boolean {
  const password = configuredPassword();
  if (!password || !token) return false;

  const [expiresPart, signature, ...rest] = token.split(".");
  if (!expiresPart || !signature || rest.length > 0) return false;

  const expiresAtMs = Number(expiresPart);
  if (!Number.isSafeInteger(expiresAtMs) || expiresAtMs < Date.now()) return false;

  return safeEqual(signature, sign(expiresAtMs, password));
}
