# Virtual Care Platform

Dr. Nneoma Oparaji's virtual-only practice (United States and Nigeria): public site, patient portal, booking with a membership-aware pricing engine, payments in USD and NGN, video visits, and a doctor portal. It is built from the 122-board design canvas mirrored in [design/](design/). [PLAN.md](PLAN.md) maps every board to its route.

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

Mock payments (`PAYMENTS_PROVIDER=mock`, the default): card `4000 0000 0000 0002` is declined. Any other valid card number succeeds, for example `4242 4242 4242 4242`.

## Scripts

| | |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run db:local` | Local MongoDB replica set, with data kept in `.mongo-data/` |
| `npm run db:push` / `db:seed` | Sync schema / reset demo data |
| `npm test` | Unit tests: pricing engine, slot engine, time zones |
| `npm run test:e2e` | Playwright journeys. Reseeds (wipes) the database first, so it refuses to run unless `DATABASE_URL` is local |
| `npm run email:test -- you@example.com [template|all] [us|ng]` | Sends sample emails through your real mail settings |
| `npm run typecheck`, `npm run lint` | |

## US and Nigeria sites

The practice is virtual-only and runs two patient sites from one codebase:

| | US site | Nigeria site |
|---|---|---|
| URLs | `/`, `/portal`, `/sign-in`… | `/ng`, `/ng/portal`, `/ng/sign-in`… |
| Booking regions | the 50 states + DC (only licensed states are bookable) | Nigeria |
| Prices and payments | USD, through Stripe | NGN, through Paystack (visit prices converted at the practice rate, rounded to ₦500) |
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
- deleting old video-call signalling rows

[vercel.json](vercel.json) runs it once a day at 12:00 UTC (6–7 AM US Central, 1 PM Lagos), because Vercel Hobby only allows daily cron jobs. On that schedule:
- unpaid slot holds still expire after 30 minutes: they are also released whenever slots are loaded or a payment starts
- membership renewals and endings run on the day they fall due
- the "24 h" reminder arrives sometime in the 24 hours before the visit, depending on when the visit falls relative to 12:00 UTC
- **1 h reminders only go out if the job happens to run in the hour before a visit**

To send reminders on time, also call the endpoint every 10 minutes from a free external scheduler (for example cron-job.org or a GitHub Actions schedule) with the same `Authorization` header, or move to Vercel Pro and set the schedule back to `*/5 * * * *`. Extra runs are harmless; every step is idempotent.

## Integrations

Each one sits behind an adapter and runs in a working dev mode without keys.

| | Dev (default) | Production |
|---|---|---|
| Payments ([src/lib/payments/](src/lib/payments/), [src/lib/checkout.ts](src/lib/checkout.ts)) | `mock` processor | Stripe (USD) and Paystack (NGN), `PAYMENTS_PROVIDER=live` |
| Email ([src/lib/email/](src/lib/email/)) | console + `EmailOutbox` | Any SMTP server, e.g. Hostinger (`EMAIL_PROVIDER=smtp`), or Resend |
| Video ([src/lib/video.ts](src/lib/video.ts)) | built-in peer-to-peer WebRTC | same, plus a TURN relay; or Daily.co (`VIDEO_PROVIDER=daily`) |

## Payments

`PAYMENTS_PROVIDER="live"` turns on real payments (`"test"` does the same but accepts only `sk_test_` keys, so nothing real is charged). The processor follows the account, not the card: **Nigeria accounts pay in naira through Paystack; every other account pays in dollars through Stripe.**

**How it stays secure**
- **Card numbers never touch this app.** New cards are entered on Stripe Checkout or Paystack's checkout page. We store only a reusable token (Stripe `pm_…` / Paystack authorization code), the brand, the last 4 digits and the expiry.
- **Only secret keys are used, and only on the server.** No publishable or public key is needed or exposed.
- **Amounts are set by the server** from the visit or plan, never from the browser.
- **A payment counts only once it is confirmed:**
  - The return page and the webhook both re-fetch the transaction from the provider's API and check the amount and currency.
  - The order is then fulfilled exactly once, whichever arrives first ([src/lib/checkout.ts](src/lib/checkout.ts)).
- **Webhooks are signed:**
  - Stripe uses `STRIPE_WEBHOOK_SECRET`.
  - Paystack uses an HMAC-SHA512 of the body with your secret key.
  - Unsigned requests are rejected.
- **Retries never double-charge.** Charges use idempotency keys, and renewals use a key per membership period.
- **Processors don't receive health details.** Line items say "Video visit with Dr. Oparaji" or the plan name, never the visit type.

**What patients see**
- **Pay for a visit or join a plan:** pick a saved card (charged instantly), or choose a new card and finish on the provider's page. The card is saved for renewals.
- **Nigeria visits:** Paystack also offers bank transfer and USSD. Memberships are card-only, because they renew automatically.
- **Add a card:**
  - Stripe saves it without a charge.
  - Paystack needs a ₦100 check, which is refunded straight away.
- **Refunds** (patient cancellations, doctor refunds) go back through the same processor.
- **If the 30-minute slot hold runs out before a payment finishes,** the payment is refunded automatically.

**Setup**
1. **Stripe** (Developers → API keys):
   - Put the secret key in `STRIPE_SECRET_KEY`.
   - In Developers → Webhooks, add `https://YOUR-DOMAIN/api/webhooks/stripe` with these events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`.
   - Put its signing secret in `STRIPE_WEBHOOK_SECRET`.
   - Optional hardening: use a restricted key (`rk_…`) instead of the full secret key, with write access to Customers, Checkout Sessions, PaymentIntents and Refunds, and read access to PaymentMethods and SetupIntents.
   - Set your logo and colors in Settings → Branding so Checkout matches the site.
2. **Paystack** (Settings → API Keys & Webhooks):
   - Put the secret key in `PAYSTACK_SECRET_KEY`.
   - Set the Webhook URL to `https://YOUR-DOMAIN/api/webhooks/paystack`.
3. **Go live:**
   - Set `PAYMENTS_PROVIDER="live"` and `APP_URL` to the live domain.
   - Run `npm run db:push`.
   - Make a test payment with test keys first (Stripe card `4242 4242 4242 4242`; Paystack test card `4084 0840 8408 4081`).
4. **Local webhook testing:** run `stripe listen --forward-to localhost:3000/api/webhooks/stripe` (Stripe CLI). Paystack needs a public URL; a tunnel such as ngrok works.

Cards saved while in mock mode can't be charged in live mode; patients are asked for a new card.

## Email

All templates live in [src/lib/email/templates.ts](src/lib/email/templates.ts). In development, preview every one at **/dev/emails** (add `?m=ng` for a Nigeria patient). Emails never contain clinical details; they link to the portal. Links and the emergency line follow the patient's site (`/ng` and 112/767 for Nigeria accounts).

| To | Emails |
|---|---|
| Patients | verification code, welcome, password reset, password changed, booking confirmed, rescheduled, cancelled (with refund), 24 h and 1 h reminders, missed visit, care plan ready, new message, payment received, refund, payment failed, membership ended |
| Doctor | new booking, patient cancelled, patient rescheduled, patient in the waiting room, new patient message, new website inquiry |
| Website visitors | inquiry received, reply to inquiry |

Message emails go out for the first unread message only, so a burst of messages sends one email. Patients can switch off reminders, message and care-plan emails in Settings. Every email is also stored in the `EmailOutbox` collection, with the error if delivery failed.

**Hostinger SMTP.** In `.env`: `EMAIL_PROVIDER="smtp"`, `SMTP_HOST="smtp.hostinger.com"`, `SMTP_PORT="465"`, `SMTP_USER` and `SMTP_PASS` (the full mailbox address and its password), and `EMAIL_FROM` using that same address. Set `APP_URL` to the live site so links and the logo work. Check the setup with `npm run email:test -- you@example.com all`. To stay out of spam, make sure SPF, DKIM and DMARC are set for the domain (hPanel → Emails → your domain shows the records).

## Video visits

The default, `VIDEO_PROVIDER="p2p"`, needs no account. The patient's and doctor's browsers connect directly with WebRTC, encrypted end to end, and the app only passes the connection details between them ([src/app/api/visits/[id]/signal/route.ts](src/app/api/visits/[id]/signal/route.ts), [src/components/video/use-peer.ts](src/components/video/use-peer.ts)). Nothing is recorded, and if either side reloads or the network drops, the call reconnects.

Without a relay, roughly 1 in 10 to 1 in 5 calls cannot connect on strict networks (some offices, hospitals and mobile carriers). For production, add a TURN relay:
- **Cloudflare TURN** (recommended): in the Cloudflare dashboard, open Realtime (formerly Calls) → TURN and create a key. Set `CLOUDFLARE_TURN_KEY_ID` and `CLOUDFLARE_TURN_API_TOKEN`. The app requests short-lived credentials for each visit.
- **Any other TURN server**: set `TURN_URLS`, `TURN_USERNAME` and `TURN_CREDENTIAL`.

A TURN relay only forwards encrypted media and cannot see or hear the call. **Daily.co** (`VIDEO_PROVIDER="daily"`) is still supported for hosted rooms. For HIPAA, a hosted video vendor must sign a BAA, which usually needs a paid plan.
