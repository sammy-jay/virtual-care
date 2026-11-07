# Virtual Care Platform — Build Plan

Source of truth: the "Virtual Care App Design" canvas (122 boards), mirrored in [design/](design/).
Every board maps to a route, a modal, or a state of a route (table below).

## 1. Stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router, Server Components, Server Actions), TypeScript | |
| Styling | Tailwind CSS v4 with the design tokens as `@theme` variables | Manrope (body) + Newsreader (display) via `next/font` |
| Database | MongoDB (Atlas or a local replica set) | Prisma needs a replica set for writes |
| ORM | Prisma 6.19 (`provider = "mongodb"`) | Pinned to 6.x: it has stable MongoDB support |
| Auth | Our own session auth: bcrypt hashes, DB-backed sessions in an httpOnly cookie | Needed for lockout, device list, "sign out everywhere", doctor TOTP |
| 2FA | `otplib` TOTP (doctor required, patient optional) | |
| Validation | `zod` | Same schemas on client and server |
| Dates / time zones | `date-fns` + `date-fns-tz` | All times stored in UTC; shown in viewer zone + practice zone (America/Chicago) |
| Payments | Adapter: Stripe (USD), Paystack (NGN), `mock` provider for dev | Mock: `4000 0000 0000 0002` declines, anything else succeeds |
| Email | Adapter: Resend; dev logs to console + `EmailOutbox` collection | No clinical content in emails |
| Video | Adapter: Daily.co rooms; dev falls back to local camera preview | Rooms open 15 min before, close 60 min after |
| Charts | Hand-built SVG (matches the boards) | |

## 2. Design system (from 01.1 Style Guide / 01.2 Components)

- Brand: Forest `#17604B`, Forest deep `#0F4636`, Ink `#0C111B`, White.
- Accents: Gold `#E6A93B`, Coral `#E2674A`, Sky `#3E6FD1`.
- Tints: Sage `#E7F2ED`, Sand `#FBF5EA`, Gold tint `#FCF1D9`, Coral tint `#FCE9E3`, Sky tint `#E8EFFB`.
- Neutrals: Canvas `#F7F6F1`, Line `#E5E7EB`, Muted `#6B7280`; Success `#14532D`, Warning `#7A4B07`, Danger `#C0392B`.
- Type: Display 52, H 36, H 24 (Newsreader 400); body 16 Manrope; caption 13; eyebrow 12–13 / 800 / .14em uppercase.
- Cards: 14–20px radius, 1px line, 22–24px padding. Pills: 999px radius. Spacing 4/8/12/16/24/32/48. Targets ≥44px. Focus ring 3px.
- Components: Button (primary/secondary/danger/gold/disabled/small), Field (default/filled/focus/error/disabled), Checkbox, Radio, Chip, StatusTag (Scheduled/Completed/No-show/Paid/Refunded/New/Replied/Closed/Active/Blocked), Alert (info/success/warning/error), Tabs, Avatar, Badge, Table, Card, Skeleton, Toggle, Modal, Stepper, Emergency bar.

## 3. Layout shells

- **PublicShell** — emergency bar, nav (Services, Membership, About, FAQ, Contact, Sign in, Get started), sage footer; cookie banner.
- **AuthSplit** — forest panel (46%) with the brand line and decorative circles + form column.
- **PatientShell** — 264px sidebar (Book a visit CTA, 8 nav items, plan card, user), top bar (breadcrumb, search, time-zone chip, Help, bell). Mobile: bottom tabs Home · Visits · Messages · Plan · Profile.
- **DoctorShell** — 248px sidebar (Start next visit CTA, 9 nav items with unread badges, "Accepting bookings" card), top bar. Mobile: bottom tabs Today · Visits · Patients · Inbox · More.
- **VideoShell** — dark full-screen room for patient and doctor.
- **Modal** — the centred card on a sage→sky gradient used by every confirm dialog.

## 4. Route map (board → implementation)

### Public (02)
| Board | Route |
|---|---|
| 02.1 Home | `/` (next intro slots come from real availability) |
| 02.2 Services | `/services` (visit types from DB) |
| 02.3 Membership | `/membership` (plans from DB + compare table) |
| 02.4 About | `/about` |
| 02.5 FAQ | `/faq` (category filter + accordion) |
| 02.6 Contact | `/contact` → creates an `Inquiry` |
| 02.7 Cookie banner | global `<CookieBanner>` (banner + manage-preferences states) |
| 02.8–02.10 Legal | `/privacy`, `/terms`, `/telehealth-consent` |

### Auth (03)
| Board | Route |
|---|---|
| 03.1/03.2 Sign up (+errors) | `/sign-up` |
| 03.3/03.4 Sign in (+error) | `/sign-in` |
| 03.5 Account locked | `/sign-in/locked` (5 failures → 15 min pause, live countdown) |
| 03.6 Reset email sent | `/forgot-password/sent` (resend cooldown) |
| 03.7 Reset link expired | `/reset-password?token=…` when the token is invalid or expired |
| 03.8 Verify email | `/verify-email` (6-digit code, 15 min, resend after 30 s) |
| 03.9 Set new password | `/reset-password?token=…` |
| 03.10 Password updated | `/reset-password/done` (revokes all sessions) |
| 03.11 Doctor sign in | `/doctor/sign-in` (password + TOTP) |

### Patient: booking and visits (04)
| Board | Route |
|---|---|
| 04.1 Intro call booking | `/portal/book?type=intro` |
| 04.2/04.3/04.5 Book a visit (included / member rate / paid) | `/portal/book` — one screen, the pricing engine picks the state |
| 04.4 Time zones | `/portal/book/time` (side-by-side clocks, DST notice) |
| 04.6 Booking errors | client + server validation states on `/portal/book` |
| 04.7 Consent reconfirm | modal on submit when consent is older than this booking |
| 04.8 Unlicensed region | modal when the chosen region is not licensed |
| 04.9 Booking confirmed | `/portal/visits/[id]/confirmed` (+ .ics "Add to calendar") |
| 04.10 Post-visit invitation | `/portal/next-steps` (after intro call is completed) |
| 04.11 My visits | `/portal/visits` (Upcoming / Past tabs + detail pane) |
| 04.12 Care plan | `/portal/care-plans/[id]` |
| 04.13 Cancel confirm | modal on My visits |
| 04.14 Cancel blocked | modal when <12 h to visit |
| 04.15 Reschedule | modal on My visits |

### Patient: portal (05)
| Board | Route |
|---|---|
| 05.1 Overview / 05.2 Overview empty | `/portal` |
| 05.3 Messages / 05.4 Messaging locked | `/portal/messages` |
| 05.5/05.6 Health profile (+errors) | `/portal/health-profile` |
| 05.7 Account settings | `/portal/settings` |
| 05.8 Care plans | `/portal/care-plans` |
| 05.9 Progress | `/portal/progress` (charts + quick log) |
| 05.10 Notifications | `/portal/notifications` |
| 05.11 Help | `/portal/help` |
| 05.12 Security | `/portal/settings/security` (password, TOTP, sessions) |
| 05.13 Data and privacy | `/portal/settings/privacy` (export request, access log) |
| 05.14 Delete account | modal (type DELETE) |

### Patient: membership and payments (06)
| Board | Route |
|---|---|
| 06.1 Membership | `/portal/membership` |
| 06.2 Billing | `/portal/billing` |
| 06.3/06.4 Checkout USD / NGN | `/portal/checkout?plan=thrive` (currency from card country / region) |
| 06.5 Visit payment | `/portal/visits/[id]/pay` |
| 06.6 Receipt | `/portal/billing/[paymentId]` (+ PDF download) |
| 06.7 Payment failed | `/portal/billing/failed` (3-day grace) |
| 06.8 Refund notice | `/portal/billing/refunds/[id]` |
| 06.9 Switch plan / 06.10 Cancel membership | modals on Membership (proration) |
| 06.11 Payment methods | `/portal/settings/payment-methods` |

### Patient: video (07)
| Board | Route |
|---|---|
| 07.1 Precheck / 07.5 Permission blocked | `/portal/visits/[id]/precheck` |
| 07.2 Waiting / 07.3 In call / 07.4 Reconnecting | `/portal/visits/[id]/room` (states of one client component) |
| 07.6 Room closed | `/portal/visits/[id]/room` outside the open window |
| 07.7 Visit ended | `/portal/visits/[id]/ended` |
| 07.8 Feedback | `/portal/visits/[id]/feedback` |

### System (08)
| Board | Implementation |
|---|---|
| 08.1 System states | `<EmptyState>`, `<Skeleton>`, `loading.tsx`, session-expired redirect, `<ErrorState>` |
| 08.2 Emails | `lib/email/templates.ts` (8 templates) |
| 08.3 404 / 08.4 Server error | `not-found.tsx`, `error.tsx`, `global-error.tsx` |

### Doctor (09, 10)
| Board | Route |
|---|---|
| 09.1 Dashboard | `/doctor` |
| 09.2 Notifications | `/doctor/notifications` |
| 09.3 Search | `/doctor/search?q=` |
| 09.4 Appointments | `/doctor/appointments?week=` (week grid + day list) |
| 09.5 Patients | `/doctor/patients` (filters, CSV export) |
| 09.6/09.7/09.20/09.21 Patient record tabs | `/doctor/patients/[id]` `…/visits` `…/care-plans` `…/messages` `…/billing` |
| 09.8 Messages | `/doctor/messages` |
| 09.9/09.10 Inquiries | `/doctor/inquiries`, `/doctor/inquiries/[id]` |
| 09.11 Care plan editor | `/doctor/care-plans/[id]` (+ 10.10 publish confirm modal) |
| 09.12 Visit notes | `/doctor/visits/[id]/notes` (SOAP + timer) |
| 09.13 Message templates | `/doctor/messages/templates` |
| 09.14 Earnings | `/doctor/earnings` (+ 10.9 refund modal) |
| 09.15 Insights | `/doctor/insights?range=30d|90d|12m` |
| 09.16 Settings | `/doctor/settings` (+ 10.11–10.14 visit type / plan modals) |
| 09.17 Licensure | `/doctor/settings/licensure` |
| 09.18 Access log | `/doctor/settings/access-log` (append-only, CSV) |
| 09.19 Data requests | `/doctor/settings/data-requests` |
| 09.22 Practice setup | `/doctor/setup` (5-step checklist; booking blocked until published) |
| 10.1 Waiting room | `/doctor/visits/[id]/waiting` |
| 10.2 Video room | `/doctor/visits/[id]/room` (patient context + quick notes) |
| 10.3–10.6 Availability + add window / time off / copy day | `/doctor/availability` + modals |
| 10.7 Reschedule / 10.8 No-show | modals on Appointments / waiting room |

### Responsive (11)
Mobile (390 and 320) and tablet boards are implemented as breakpoints of the same routes: sidebars collapse to bottom tab bars, the booking grid stacks, tables become cards.

## 5. Business rules (from 01.6 Pricing Rules and copy across boards)

**Pricing engine (`lib/pricing.ts`, unit tested).** Inputs are visit type, the patient's membership, and the allowance used in the current period. Output is `{ amountCents, currency, reason, label, explanation }`.
1. Intro call → always free, no card step.
2. Included visit (the type is in the plan's included list and allowance remains) → $0 and no payment step. The allowance is reserved at booking.
3. Member, but not included or allowance used up → member rate. Show a "Why am I paying?" note.
4. No plan → standard price, plus a nudge to join Thrive.
5. Every payment screen states why the amount is what it is.
6. Nigerian cards pay in naira at a fixed monthly price (Thrive ₦193,500).

**Allowance.** Resets each billing date with no rollover. It returns if the visit is cancelled more than 12 h ahead and is consumed by a no-show.
**Cancellation.** Free up to 12 h before, with an automatic refund for paid visits. Inside 12 h the patient sees the "Cancel blocked" screen and is told to message the doctor.
**Booking rules.** 12 h notice and a 15 min buffer. Slots come from weekly windows minus time off and existing appointments. Visit types can be limited per window.
**Follow-up** needs a completed prior visit.
**Licensure.** The patient picks a region at booking. Regions not licensed (e.g. California, Ghana) are blocked and show the Unlicensed screen.
**Consent.** Accepted at sign-up and per booking, and stored with a timestamp.
**Messaging.** Members message all month. Pay-per-visit patients can message for 14 days after a visit. Otherwise the locked screen shows.
**Video room.** Opens 15 min before and closes 60 min after the end. Visits are never recorded. A backup link is emailed.
**No-show.** Uses the included visit, emails the patient, and can be undone for 24 h.
**Membership.** Switching plans charges a prorated amount today. Cancelling keeps access until the period end. A failed payment gives 3 days of grace.
**Auth.** Passwords need 10+ characters. 5 failed sign-ins pause sign-in for 15 min. Reset links are single use and last 60 min. Email codes last 15 min. A password change signs out every other session.
**Compliance.** The access log records every view of patient data, is kept 7 years, and cannot be edited. Data requests are due within 30 days. Deleting an account removes the profile and messages, but medical records are kept for the legal period.
**Emails** never contain clinical content.

### Conflicts in the design (resolved, flagged for the practice)
- **Family Focus.** The public Home and Membership pages say $199/mo, 2 visits, 20% off. Pricing Rules, doctor Settings and patient Membership say **$229/mo, 3 visits, 15%**. Pricing Rules calls itself the single rule set, so **seed with $229 / 3 / 15%**. Public pages read from the DB, so they now agree.
- **Connect discount.** The public pages say 10%; Pricing Rules and Settings say 15%. **Seed with 15%.**
- Every price is editable in doctor Settings, so the practice can change these.

## 6. Data model (Prisma / MongoDB)
`User`, `Session`, `AuthToken` (email code / reset), `PatientProfile`, `Practice` (singleton: zone, rules, published, payout), `VisitType`, `Plan`, `Membership`, `Appointment`, `AvailabilityWindow`, `TimeOff`, `CarePlan`, `VisitNote`, `Conversation`, `Message`, `MessageTemplate`, `Inquiry`, `Payment`, `Refund`, `PaymentMethod`, `Notification`, `Measurement`, `AccessLog`, `DataRequest`, `Feedback`, `License`, `EmailOutbox`. See [prisma/schema.prisma](prisma/schema.prisma).

## 7. Phases
0. **Foundation.** Scaffold, tokens, fonts, UI kit, the four shells, error pages.
1. **Data.** Prisma schema and a seed that recreates the design's world (Adaeze, Tunde, Chidi, Ngozi, Mercy, the inquiries, payments and plans).
2. **Auth.** Sign up, verify, sign in, lockout, reset, doctor TOTP, sessions, route guards.
3. **Public site.** All 10 pages, contact → inquiry, cookie banner.
4. **Booking.** Pricing engine, slot engine, time zones, licensure, consent, confirm, cancel, reschedule.
5. **Patient portal.** Overview, visits, care plans, progress, messages, profile, settings, notifications, help, security, privacy.
6. **Payments.** Checkout (USD/NGN), visit payment, receipts (PDF), failed, refunds, payment methods, switch and cancel plans.
7. **Video.** Precheck, waiting, room, reconnecting, permission blocked, closed, ended, feedback.
8. **Doctor portal.** Dashboard, appointments, patients and records, messages, templates, inquiries, care plans, notes, earnings, insights, settings, licensure, access log, data requests, setup.
9. **Availability.** Windows, time off, copy day, reschedule, no-show, refund modals.
10. **Background.** Email templates, reminders (24 h / 1 h cron route), notifications, access logging middleware.
11. **Polish.** Responsive pass at 320/390/768, accessibility, and tests for the pricing, slot and auth rules.

## 8. Environment
```
DATABASE_URL="mongodb+srv://…/virtualcare?retryWrites=true&w=majority"
SESSION_SECRET=…            # 32+ random bytes
APP_URL=http://localhost:3000
PAYMENTS_PROVIDER=mock      # mock | live
STRIPE_SECRET_KEY= PAYSTACK_SECRET_KEY=
EMAIL_PROVIDER=console      # console | resend
RESEND_API_KEY= EMAIL_FROM=
VIDEO_PROVIDER=local        # local | daily
DAILY_API_KEY=
CRON_SECRET=
```

## 9. Status (7 Nov 2026)

**Built:** phases 0–11. Every board in §4 has its route, dialog or state. That includes all 10 public pages, all 12 auth screens (plus a 2-step code screen for patients who turn on an authenticator), 45 patient screens and dialogs, and 36 doctor screens and dialogs. Responsive layouts are done, with mobile bottom tabs.

**Verified:**
- 14 unit tests (pricing, slots, time zones)
- 8 Playwright journeys: sign-up → verify → profile → intro booking; unlicensed region; member rate + declined card + retry; cancel returns allowance; lockout; doctor TOTP → publish plan → reply; role isolation; full video visit (waiting → admit → end)
- Every route returns 200 for its role
- Lint, typecheck and production build are clean

**Not done / needs the practice:**
- Live Stripe and Paystack calls, plus hosted card fields. The mock processor is fully wired.
- SMS reminders. Email reminders work; the boards say "Email and SMS", and that needs an SMS provider.
- Bank-transfer checkout for NGN. The option is shown but disabled until live payments are on.
- The data export is JSON, not the "ZIP with PDF and CSV" on board 09.19.
- Receipts and care plans download through the browser's print-to-PDF, not a generated PDF.
- The pricing conflicts in §5 need sign-off.
