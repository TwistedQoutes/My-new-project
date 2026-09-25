// One place to answer "what's set up so far?" for the dashboard pages.

import { isDatabaseConfigured } from "./db";
import { getGmailAccount, type GmailAccount } from "./gmail";
import { isGoogleConfigured } from "./google";

export type SetupStatus = {
  database: "ok" | "missing" | "error";
  databaseError: string | null;
  googleKeys: boolean;
  gmail: GmailAccount | null;
};

export async function getSetupStatus(): Promise<SetupStatus> {
  const status: SetupStatus = {
    database: "missing",
    databaseError: null,
    googleKeys: isGoogleConfigured(),
    gmail: null,
  };
  if (!isDatabaseConfigured()) return status;

  try {
    // Reading the Gmail row also creates the tables on first run, so success
    // here proves the database works.
    status.gmail = await getGmailAccount();
    status.database = "ok";
  } catch (error) {
    console.error("Database check failed", error);
    status.database = "error";
    status.databaseError = error instanceof Error ? error.message : String(error);
  }
  return status;
}
