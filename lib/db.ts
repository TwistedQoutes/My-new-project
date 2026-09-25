// Database access (Neon Postgres, connected through Vercel → Storage).
//
// Tables are created automatically the first time the app talks to the
// database, so you never have to run SQL by hand. Every statement uses
// "IF NOT EXISTS", so running it again is harmless.

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

function databaseUrl(): string | null {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || null;
}

export function isDatabaseConfigured(): boolean {
  return databaseUrl() !== null;
}

let client: NeonQueryFunction<false, false> | null = null;

function rawSql(): NeonQueryFunction<false, false> {
  const url = databaseUrl();
  if (!url) throw new Error("Database is not connected (DATABASE_URL is missing in Vercel).");
  client ??= neon(url);
  return client;
}

let schemaReady: Promise<void> | null = null;

function createSchema(): Promise<void> {
  const sql = rawSql();
  return sql
    .transaction([
      // The one Gmail account InboxBouncer manages. The CHECK keeps it to a
      // single row. The refresh token is useless without GOOGLE_CLIENT_SECRET,
      // which lives only in Vercel.
      sql`CREATE TABLE IF NOT EXISTS gmail_account (
        id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
        email text NOT NULL,
        refresh_token text NOT NULL,
        scopes text NOT NULL,
        history_id text,
        status text NOT NULL DEFAULT 'ok',
        last_error text,
        connected_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`,
    ])
    .then(() => undefined);
}

// Returns the query function, making sure the tables exist first.
export async function db(): Promise<NeonQueryFunction<false, false>> {
  schemaReady ??= createSchema().catch((error) => {
    schemaReady = null;
    throw error;
  });
  await schemaReady;
  return rawSql();
}
