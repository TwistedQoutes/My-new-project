// Call requireSession() at the top of every protected page and server action.
// proxy.ts already bounces logged-out visitors, but checking again right next
// to the data is the belt-and-braces approach Next.js recommends.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isValidSessionToken, SESSION_COOKIE } from "./session";

export async function isLoggedIn(): Promise<boolean> {
  const cookieStore = await cookies();
  return isValidSessionToken(cookieStore.get(SESSION_COOKIE)?.value);
}

export async function requireSession(): Promise<void> {
  if (!(await isLoggedIn())) redirect("/login");
}
