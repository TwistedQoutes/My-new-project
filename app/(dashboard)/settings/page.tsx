import { requireSession } from "@/lib/auth";
import { SecretGenerator } from "./SecretGenerator";

const COMING_SOON = [
  "Reply mode per bin: Off / Draft / Auto-send",
  "Allowlist of emails and domains that are never binned",
  "Confidence threshold for binning",
  "Kill switch that stops all sending instantly",
  "Pause everything",
];

export default async function SettingsPage() {
  await requireSession();

  return (
    <>
      <h1>Settings</h1>

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
