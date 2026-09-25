import { requireSession } from "@/lib/auth";

export default async function DraftsPage() {
  await requireSession();

  return (
    <>
      <h1>Drafts</h1>
      <section className="card">
        <p className="muted">
          AI reply drafts will show up here once replies are turned on (Phase 6). You&apos;ll be able
          to read, edit, send, or throw away each one.
        </p>
      </section>
    </>
  );
}
