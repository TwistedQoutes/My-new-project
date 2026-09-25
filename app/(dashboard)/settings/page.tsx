import { headers } from "next/headers";
import Link from "next/link";
import { CopyButton } from "@/app/components/CopyButton";
import { LocalTime } from "@/app/components/LocalTime";
import { requireSession } from "@/lib/auth";
import { appOrigin, CALLBACK_PATH } from "@/lib/google";
import { getSetupStatus } from "@/lib/setup";
import { disconnectGmail } from "./actions";
import { SecretGenerator } from "./SecretGenerator";

const GMAIL_ERRORS: Record<string, string> = {
  not_configured:
    "Google keys aren't in Vercel yet. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, then redeploy.",
  access_denied: "You tapped Cancel on Google's screen, so nothing was connected. Try again.",
  google_error:
    "Google showed an error. Check that the two addresses below match Google Cloud exactly, then try again.",
  state_mismatch:
    "That connection attempt expired or opened in a different tab. Tap Connect Gmail again.",
  token_exchange_failed:
    "Google refused the sign-in. Usually GOOGLE_CLIENT_SECRET in Vercel is wrong, or the redirect address below doesn't match Google Cloud exactly.",
  missing_scope:
    "Google's permission screen had a box that wasn't ticked. Tap Connect Gmail again and tick every box.",
  no_refresh_token: "Google didn't send a long-term key. Tap Connect Gmail again.",
  profile_failed:
    "Signed in, but couldn't read your Gmail. Check that the Gmail API is enabled in Google Cloud.",
  database: "Signed in, but couldn't save the connection to the database. Try again.",
};

const COMING_SOON = [
  "Reply mode per bin: Off / Draft / Auto-send",
  "Allowlist of emails and domains that are never binned",
  "Confidence threshold for binning",
  "Kill switch that stops all sending instantly",
  "Pause everything",
];

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ gmail?: string; gmail_error?: string }>;
}) {
  await requireSession();

  const { gmail: gmailResult, gmail_error: gmailError } = await searchParams;
  const origin = appOrigin(await headers());
  const redirectUri = origin + CALLBACK_PATH;
  const setup = await getSetupStatus();
  const account = setup.gmail;
  const canConnect = setup.database === "ok" && setup.googleKeys;

  return (
    <>
      <h1>Settings</h1>

      <section className="card">
        <h2>Gmail connection</h2>

        {gmailResult === "connected" && (
          <div className="alert alert-ok">
            Gmail connected! <Link href="/">Go to Home</Link> to see your latest emails.
          </div>
        )}
        {gmailResult === "disconnected" && <div className="alert alert-ok">Gmail disconnected.</div>}
        {gmailError && (
          <div className="alert alert-error">
            {GMAIL_ERRORS[gmailError] ?? "Something went wrong connecting Gmail. Try again."}
          </div>
        )}

        {setup.database !== "ok" && (
          <p className="muted">
            Connect the database first (Vercel → Storage). Status is on the Home page.
          </p>
        )}
        {setup.database === "ok" && !setup.googleKeys && (
          <p className="muted">
            Waiting for the Google keys. Add <strong>GOOGLE_CLIENT_ID</strong> and{" "}
            <strong>GOOGLE_CLIENT_SECRET</strong> in Vercel, then redeploy.
          </p>
        )}

        {canConnect && !account && (
          <>
            <p className="muted">Not connected yet.</p>
            <a className="button" href="/api/auth/google/start">
              Connect Gmail
            </a>
          </>
        )}

        {canConnect && account?.status === "needs_reconnect" && (
          <>
            <div className="alert alert-warn">
              Google ended the connection for <strong>{account.email}</strong>. This happens after 7
              days while the Google app is in &quot;Testing&quot;, or after a Google password change.
            </div>
            <a className="button" href="/api/auth/google/start">
              Reconnect Gmail
            </a>
          </>
        )}

        {account?.status === "ok" && (
          <>
            <p>
              Connected as <strong>{account.email}</strong>
              <br />
              <span className="muted small">
                Since <LocalTime iso={account.connectedAt.toISOString()} mode="full" />
              </span>
            </p>
            <form action={disconnectGmail}>
              <button className="button button-quiet" type="submit">
                Disconnect Gmail
              </button>
            </form>
          </>
        )}
      </section>

      <section className="card">
        <h2>Google Cloud setup values</h2>
        <p className="muted small">
          When Google Cloud asks for these while you create the sign-in client, copy them from
          here.
        </p>

        <label>Authorized JavaScript origin</label>
        <div className="copy-field">
          <code>{origin}</code>
          <CopyButton text={origin} />
        </div>

        <label>Authorized redirect URI</label>
        <div className="copy-field">
          <code>{redirectUri}</code>
          <CopyButton text={redirectUri} />
        </div>
      </section>

      <section className="card">
        <h2>Coming in later phases</h2>
        <ul className="checklist">
          {COMING_SOON.map((item) => (
            <li key={item} className="muted">
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>Random secret maker</h2>
        <p className="muted small">
          Later setup steps ask you to paste a long random secret into Vercel. Tap the button, then
          Copy. It&apos;s made on this device and never sent anywhere.
        </p>
        <SecretGenerator />
      </section>
    </>
  );
}
