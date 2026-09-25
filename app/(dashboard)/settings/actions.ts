"use server";

import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { deleteGmailAccount } from "@/lib/gmail";
import { revokeToken } from "@/lib/google";

export async function disconnectGmail() {
  await requireSession();
  const refreshToken = await deleteGmailAccount();
  if (refreshToken) await revokeToken(refreshToken);
  redirect("/settings?gmail=disconnected");
}
