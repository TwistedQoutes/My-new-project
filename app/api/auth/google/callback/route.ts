// Step 2 of connecting Gmail: Google sends you back here with a one-time code.

import { NextResponse, type NextRequest } from "next/server";
import { isLoggedIn } from "@/lib/auth";
import { fetchProfile, saveGmailAccount } from "@/lib/gmail";
import { appOrigin, exchangeCode, GMAIL_MODIFY_SCOPE, OAUTH_STATE_COOKIE } from "@/lib/google";

export async function GET(request: NextRequest) {
  const origin = appOrigin(request.headers);
  if (!(await isLoggedIn())) return NextResponse.redirect(new URL("/login", origin));

  const params = request.nextUrl.searchParams;
  const backToSettings = (query: string) => {
    const response = NextResponse.redirect(new URL(`/settings?${query}`, origin));
    response.cookies.set(OAUTH_STATE_COOKIE, "", { path: "/api/auth/google", maxAge: 0 });
    return response;
  };

  const googleError = params.get("error");
  if (googleError) {
    return backToSettings(
      `gmail_error=${googleError === "access_denied" ? "access_denied" : "google_error"}`,
    );
  }

  const code = params.get("code");
  const state = params.get("state");
  const expectedState = request.cookies.get(OAUTH_STATE_COOKIE)?.value;
  if (!code || !state || !expectedState || state !== expectedState) {
    return backToSettings("gmail_error=state_mismatch");
  }

  let tokens;
  try {
    tokens = await exchangeCode(code, origin);
  } catch (error) {
    console.error("Google code exchange failed", error);
    return backToSettings("gmail_error=token_exchange_failed");
  }

  // Google lets you untick permissions on its screen. Without this one the
  // app can't read or sort your mail.
  const scopes = tokens.scope ?? "";
  if (!scopes.split(" ").includes(GMAIL_MODIFY_SCOPE)) {
    return backToSettings("gmail_error=missing_scope");
  }
  if (!tokens.refresh_token) {
    return backToSettings("gmail_error=no_refresh_token");
  }

  let profile;
  try {
    profile = await fetchProfile(tokens.access_token);
  } catch (error) {
    console.error("Gmail profile lookup failed", error);
    return backToSettings("gmail_error=profile_failed");
  }

  try {
    await saveGmailAccount({
      email: profile.emailAddress.toLowerCase(),
      refreshToken: tokens.refresh_token,
      scopes,
      historyId: profile.historyId ?? null,
    });
  } catch (error) {
    console.error("Saving Gmail connection failed", error);
    return backToSettings("gmail_error=database");
  }

  return backToSettings("gmail=connected");
}
