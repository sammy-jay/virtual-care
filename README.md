# Virtual Care Platform

Dr. Nneoma Oparaji's virtual practice (Houston · Lagos): public site, patient portal, booking with a membership-aware pricing engine, payments in USD and NGN, video visits, and a doctor portal. It is built from the 122-board design canvas mirrored in [design/](design/). [PLAN.md](PLAN.md) maps every board to its route.

**Stack:** Next.js 16 (App Router, Server Actions) · TypeScript · Tailwind v4 · MongoDB · Prisma 6 · Vitest · Playwright

## Run it locally

```bash
npm install
cp .env.example .env          # then set SESSION_SECRET and CRON_SECRET
npm run db:local              # terminal 1: local MongoDB replica set on :27027 (no Docker needed)
# set DATABASE_URL="mongodb://127.0.0.1:27027/virtualcare?replicaSet=rs0&directConnection=true"
npm run db:push && npm run db:seed
npm run dev                   # terminal 2
```

To use MongoDB Atlas instead, put its connection string in `DATABASE_URL`. Prisma needs a replica set, which Atlas provides.

### Seeded accounts (password `password1234`)

| Who | Email | Notes |
|---|---|---|
| Thrive member | adaeze@example.com | Upcoming included follow-up, care plans, progress, messages, receipts |
| Brand-new patient | new@example.com | Empty overview (05.2) |
| Pay per visit | chidi@example.com | |
| Doctor | doctor@example.com | Also needs a TOTP code. Add secret `JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP` to any authenticator app |

In dev, emails print to the terminal and are stored in the `EmailOutbox` collection. Verification codes and reset links appear there.

Mock payments: card `4000 0000 0000 0002` is declined. Any other valid card number succeeds, for example `4242 4242 4242 4242`.

## Scripts

| | |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run db:local` | Local MongoDB replica set, with data kept in `.mongo-data/` |
| `npm run db:push` / `db:seed` | Sync schema / reset demo data |
| `npm test` | Unit tests: pricing engine, slot engine, time zones |
| `npm run test:e2e` | Playwright journeys (reseeds the database first) |
| `npm run typecheck`, `npm run lint` | |

## US and Nigeria sites

The practice is virtual-only and runs two patient sites from one codebase:

| | US site | Nigeria site |
|---|---|---|
| URLs | `/`, `/portal`, `/sign-in`… | `/ng`, `/ng/portal`, `/ng/sign-in`… |
| Booking regions | the 50 states + DC (only licensed states are bookable) | Nigeria |
| Plan prices | USD | NGN (visit prices show an approximate naira figure) |
| Emergency line | 911 | 112 or 767 |

- **Which site a visitor sees** ([src/proxy.ts](src/proxy.ts)) depends on their current location (`x-vercel-ip-country`, set by Vercel). Visitors in Nigeria get `/ng`; everyone else gets the root, and public pages redirect either way. There is no manual switch. When the location is unknown (local development), the URL is respected, so open `/ng` directly to test the Nigeria site.
- **The patient portal follows the account, not the location**, so a patient who travels keeps their own portal. The `vc_market` cookie set at sign-in routes portal links, and the DAL corrects anything else.
- **Accounts belong to one site** (`User.market`). Signing up on `/ng` creates a Nigeria account. A patient who opens the other site's portal is sent to the same page on their own site ([src/lib/auth/dal.ts](src/lib/auth/dal.ts)).
- **The doctor portal (`/doctor`) is shared.** The patient list labels each patient US or NG.
- **Links** use the site-aware `Link` from [src/components/market.tsx](src/components/market.tsx), which adds `/ng` on the Nigeria site.
- **Licensure** lives in Settings → Licensure. The same records decide which states can book and draw the US map on the home and About pages.

After deploying this change to a database with existing accounts, run once:

```bash
npx tsx --env-file-if-exists=.env scripts/backfill-market.mts
```

It sets `market` to NG for patients whose profile region is Nigeria and US for everyone else.

## Background jobs

`GET /api/cron/tick` with `Authorization: Bearer $CRON_SECRET` handles:
- 24 h and 1 h visit reminders
- releasing unpaid slot holds after 30 minutes
- renewing memberships, with a 3-day grace period when payment fails
- ending memberships that were cancelled at period end

[vercel.json](vercel.json) runs it once a day at 12:00 UTC (6–7 AM Houston, 1 PM Lagos), because Vercel Hobby only allows daily cron jobs. On that schedule:
- unpaid slot holds still expire after 30 minutes: they are also released whenever slots are loaded or a payment starts
- membership renewals and endings run on the day they fall due
- the "24 h" reminder arrives sometime in the 24 hours before the visit, depending on when the visit falls relative to 12:00 UTC
- **1 h reminders only go out if the job happens to run in the hour before a visit**

To send reminders on time, also call the endpoint every 10 minutes from a free external scheduler (for example cron-job.org or a GitHub Actions schedule) with the same `Authorization` header, or move to Vercel Pro and set the schedule back to `*/5 * * * *`. Extra runs are harmless; every step is idempotent.

## Integrations

Each one sits behind an adapter and runs in a working dev mode without keys.

| | Dev (default) | Production |
|---|---|---|
| Payments ([src/lib/payments.ts](src/lib/payments.ts)) | `mock` processor | **To do:** Stripe (USD) and Paystack (NGN) calls, plus hosted card fields in [card-form.tsx](src/components/portal/card-form.tsx) |
| Email ([src/lib/email.ts](src/lib/email.ts)) | console + `EmailOutbox` | Resend (`EMAIL_PROVIDER=resend`) |
| Video ([src/lib/video.ts](src/lib/video.ts)) | local camera; the waiting, admit and end flow is driven by the database | Daily.co private rooms (`VIDEO_PROVIDER=daily`) |
