import Link from "next/link";
import { LocalTime } from "@/app/components/LocalTime";
import { requireSession } from "@/lib/auth";
import { GmailNotConnectedError, listLatestInbox, type EmailSummary } from "@/lib/gmail";
import { getSetupStatus, type SetupStatus } from "@/lib/setup";

const BINS = [
  { key: "offshore", label: "Offshore" },
  { key: "vc", label: "VC" },
  { key: "saas", label: "SaaS" },
];

const PHASES = [
  { status: "done", text: "Password-protected dashboard on Vercel" },
  { status: "current", text: "Connect Gmail and show your last 20 emails" },
  { status: "todo", text: "Dry-run the classifier on your last 200 emails" },
  { status: "todo", text: "Turn on labeling and archiving" },
  { status: "todo", text: "Instant sorting with Gmail push notifications" },
  { status: "todo", text: "AI draft replies" },
  { status: "todo", text: "Daily digest, then auto-send" },
];

const PHASE_ICON: Record<string, string> = { done: "✅", current: "🔧", todo: "⬜️" };

type InboxResult = { emails: EmailSummary[] } | { error: string };

async function loadInbox(): Promise<InboxResult> {
  try {
    return { emails: await listLatestInbox(20) };
  } catch (error) {
    if (error instanceof GmailNotConnectedError) return { error: error.message };
    console.error("Loading inbox failed", error);
    return { error: "Couldn't load your emails from Gmail. Refresh the page to try again." };
  }
}

export default async function HomePage() {
  await requireSession();

  const setup = await getSetupStatus();
  const gmailReady = setup.gmail?.status === "ok";
  const inbox = gmailReady ? await loadInbox() : null;

  return (
    <>
      <h1>Today</h1>

      <div className="stats">
        {BINS.map((bin) => (
          <div key={bin.key} className={`stat stat-${bin.key}`}>
            <div className="stat-number">0</div>
            <div className="stat-label">{bin.label}</div>
          </div>
        ))}
      </div>

      <SetupCard setup={setup} />

      {inbox && (
        <section className="card">
          <h2>Latest 20 emails in your inbox</h2>
          {"error" in inbox ? (
            <div className="alert alert-error">{inbox.error}</div>
          ) : inbox.emails.length === 0 ? (
            <p className="muted">Your inbox is empty.</p>
          ) : (
            <ul className="email-list">
              {inbox.emails.map((email) => (
                <li key={email.id} className="email-item">
                  <div className="email-top">
                    <span className={email.unread ? "email-from unread" : "email-from"}>
                      {email.fromName}
                    </span>
                    <span className="email-date">
                      <LocalTime iso={email.date.toISOString()} />
                    </span>
                  </div>
                  <div className="email-subject">{email.subject}</div>
                  <div className="email-snippet">{email.snippet}</div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="card">
        <h2>Build progress</h2>
        <ul className="checklist">
          {PHASES.map((phase, i) => (
            <li key={phase.text}>
              <span aria-hidden="true">{PHASE_ICON[phase.status]}</span>
              <span>
                Phase {i + 1}: {phase.text}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function SetupCard({ setup }: { setup: SetupStatus }) {
  const gmailOk = setup.gmail?.status === "ok";
  if (setup.database === "ok" && setup.googleKeys && gmailOk) return null;

  const rows = [
    {
      ok: setup.database === "ok",
      label: "Database",
      detail:
        setup.database === "missing"
          ? "Not connected. In Vercel: Storage → Neon → connect to this project, then redeploy."
          : setup.database === "error"
            ? `Connected but not responding: ${setup.databaseError}`
            : "Connected",
    },
    {
      ok: setup.googleKeys,
      label: "Google keys",
      detail: setup.googleKeys
        ? "Added"
        : "Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Vercel, then redeploy.",
    },
    {
      ok: gmailOk,
      label: "Gmail",
      detail: gmailOk
        ? `Connected as ${setup.gmail?.email}`
        : setup.gmail?.status === "needs_reconnect"
          ? "Needs reconnecting. Go to Settings."
          : "Not connected yet. Go to Settings.",
    },
  ];

  return (
    <section className="card">
      <h2>Setup status</h2>
      <ul className="checklist">
        {rows.map((row) => (
          <li key={row.label}>
            <span aria-hidden="true">{row.ok ? "✅" : "❌"}</span>
            <span>
              <strong>{row.label}:</strong> <span className="muted">{row.detail}</span>
            </span>
          </li>
        ))}
      </ul>
      {setup.database === "ok" && setup.googleKeys && !gmailOk && (
        <p style={{ marginTop: 12, marginBottom: 0 }}>
          <Link href="/settings">Go to Settings to connect Gmail →</Link>
        </p>
      )}
    </section>
  );
}
