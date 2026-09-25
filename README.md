# InboxBouncer

Watches a Gmail inbox, sorts cold outreach (offshore staffing, VC meeting requests, SaaS sales)
into labeled bins, and drafts polite AI replies. Everything else stays in the inbox.

Built with Next.js (App Router, TypeScript), hosted on Vercel, data in Neon Postgres.

## Build phases

- [x] 1. Password-protected dashboard on Vercel
- [ ] 2. Google Cloud + Gmail OAuth: connect the account, show the last 20 emails
- [ ] 3. Classifier dry run on the last 200 emails (no labels, no archiving)
- [ ] 4. Labeling and archiving
- [ ] 5. Gmail push notifications + daily watch renewal
- [ ] 6. Draft replies
- [ ] 7. Daily digest, then auto-send

## Environment variables (set in Vercel → Project → Settings → Environment Variables)

| Name | Phase | What it is |
| --- | --- | --- |
| `DASHBOARD_PASSWORD` | 1 | The password for the dashboard. At least 12 characters. Changing it logs out every device. |

Never commit secrets to this repo. They live only in Vercel.

## Pages

- `/login`: the only page you can see without logging in.
- `/`: today's counts per bin and recently binned emails.
- `/drafts`: AI reply drafts to review.
- `/settings`: settings, plus a random-secret maker for filling in environment variables.
