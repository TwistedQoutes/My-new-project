import { requireSession } from "@/lib/auth";

const BINS = [
  { key: "offshore", label: "Offshore" },
  { key: "vc", label: "VC" },
  { key: "saas", label: "SaaS" },
];

const PHASES = [
  { done: true, text: "Password-protected dashboard on Vercel" },
  { done: false, text: "Connect Gmail and show your last 20 emails" },
  { done: false, text: "Dry-run the classifier on your last 200 emails" },
  { done: false, text: "Turn on labeling and archiving" },
  { done: false, text: "Instant sorting with Gmail push notifications" },
  { done: false, text: "AI draft replies" },
  { done: false, text: "Daily digest, then auto-send" },
];

export default async function HomePage() {
  await requireSession();

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

      <section className="card">
        <h2>Recently binned</h2>
        <p className="muted">Nothing yet. Gmail isn&apos;t connected.</p>
      </section>

      <section className="card">
        <h2>Build progress</h2>
        <ul className="checklist">
          {PHASES.map((phase, i) => (
            <li key={phase.text}>
              <span aria-hidden="true">{phase.done ? "✅" : "⬜️"}</span>
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
