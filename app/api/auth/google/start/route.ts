// Step 1 of connecting Gmail: send you to Google's "allow access" screen.

import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { isLoggedIn } from "@/lib/auth";
import { appOrigin, buildAuthUrl, isGoogleConfigured, OAUTH_STATE_COOKIE } from "@/lib/google";

export async function GET(request: NextRequest) {
  const origin = appOrigin(request.headers);
  if (!(await isLoggedIn())) return NextResponse.redirect(new URL("/login", origin));
  if (!isGoogleConfigured()) {
    return NextResponse.redirect(new URL("/settings?gmail_error=not_configured", origin));
  }

  // A random value we check when Google sends you back, so nobody else can
  // trick the app into connecting their account instead of yours.
  const state = randomBytes(24).toString("base64url");
  const response = NextResponse.redirect(buildAuthUrl(origin, state));
  response.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: origin.startsWith("https://"),
    sameSite: "lax",
    path: "/api/auth/google",
    maxAge: 10 * 60,
  });
  return response;
}
