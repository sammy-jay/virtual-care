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

## Background jobs

`GET /api/cron/tick` with `Authorization: Bearer $CRON_SECRET` handles:
- 24 h and 1 h visit reminders
- releasing unpaid slot holds after 30 minutes
- renewing memberships, with a 3-day grace period when payment fails
- ending memberships that were cancelled at period end

[vercel.json](vercel.json) schedules it every 5 minutes on Vercel.

## Integrations

Each one sits behind an adapter and runs in a working dev mode without keys.

| | Dev (default) | Production |
|---|---|---|
| Payments ([src/lib/payments.ts](src/lib/payments.ts)) | `mock` processor | **To do:** Stripe (USD) and Paystack (NGN) calls, plus hosted card fields in [card-form.tsx](src/components/portal/card-form.tsx) |
| Email ([src/lib/email.ts](src/lib/email.ts)) | console + `EmailOutbox` | Resend (`EMAIL_PROVIDER=resend`) |
| Video ([src/lib/video.ts](src/lib/video.ts)) | local camera; the waiting, admit and end flow is driven by the database | Daily.co private rooms (`VIDEO_PROVIDER=daily`) |
