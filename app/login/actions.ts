"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { checkPassword, createSessionToken, passwordStatus, SESSION_COOKIE } from "@/lib/session";

export async function login(formData: FormData) {
  if (passwordStatus() !== "ok") redirect("/login");

  const attempt = String(formData.get("password") ?? "");
  if (!checkPassword(attempt)) {
    // Slow down anyone trying to guess the password.
    await new Promise((resolve) => setTimeout(resolve, 1000));
    redirect("/login?error=wrong");
  }

  const session = createSessionToken();
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, session.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: session.expires,
  });
  redirect("/");
}
