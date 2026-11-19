/**
 * Every email the practice sends. Pure functions (no database, no server-only imports) so the
 * dev preview page (/dev/emails) and scripts/send-test-email.mts can render them too.
 *
 * Design: table-based HTML that works in Gmail, Apple Mail, Outlook and phone apps; a branded
 * header, visual blocks (calendar tile, receipt amount, code boxes, steps, checklist), a
 * responsive layout under 620px, and a plain-text version of every email.
 *
 * Privacy rule: emails never contain clinical content (no reasons for visit, notes, plans or
 * message bodies). They say something happened and link to the signed-in portal.
 */
import { MARKETS, withMarket, type Market } from "../market";

/** A visit time split up for the calendar tile (build with slotOf() in src/lib/time.ts). */
export type Slot = { weekday: string; day: string; month: string; time: string; when: string };

export type EmailTemplate =
  // Account
  | { template: "verify"; code: string }
  | { template: "welcome"; name: string }
  | { template: "reset_password"; token: string }
  | { template: "password_changed" }
  // Visits (patient)
  | { template: "booking_confirmed"; slot: Slot; visitType: string; id: string }
  | { template: "visit_cancelled"; when: string; visitType: string; refunded?: string }
  | { template: "visit_rescheduled"; slot: Slot; visitType: string; id: string }
  | { template: "reminder_24h"; slot: Slot; visitType: string; id: string }
  | { template: "reminder_1h"; slot: Slot; visitType: string; id: string }
  | { template: "no_show"; when: string }
  | { template: "care_plan_published"; id: string }
  // Visits (doctor)
  | { template: "doctor_new_booking"; patient: string; visitType: string; slot: Slot; id: string }
  | { template: "doctor_visit_cancelled"; patient: string; visitType: string; when: string }
  | { template: "doctor_visit_rescheduled"; patient: string; visitType: string; slot: Slot; id: string }
  | { template: "doctor_patient_waiting"; patient: string; visitType: string; id: string }
  // Messages
  | { template: "new_message" }
  | { template: "doctor_new_message"; patient: string; conversationId: string }
  // Billing
  | { template: "receipt"; amount: string; description: string; receiptNo: string; method: string; date: string; id: string }
  | { template: "refund"; amount: string; description: string; reference: string; method: string; id: string }
  | { template: "payment_failed"; plan: string }
  | { template: "membership_ended"; plan: string }
  // Contact form
  | { template: "inquiry_received"; name: string; topic: string }
  | { template: "doctor_new_inquiry"; name: string; topic: string; id: string }
  | { template: "inquiry_reply"; body: string; name?: string };

export type TemplateName = EmailTemplate["template"];

/** Who the email is for: decides links (/ng prefix), the footer and the emergency line. */
export type Audience = { kind: "patient"; market: Market } | { kind: "doctor" } | { kind: "public"; market?: Market };

type Tone = "success" | "info" | "warning" | "alert";

type Content = {
  subject: string;
  /** Inbox preview line (hidden in the body). */
  preheader: string;
  badge: { label: string; tone: Tone };
  heading: string;
  paragraphs: string[];
  code?: string;
  slot?: { slot: Slot; title: string; lines: string[] };
  amount?: { value: string; label: string; status: string };
  details?: [label: string, value: string][];
  steps?: { title: string; body: string }[];
  checklist?: { title: string; items: string[] };
  cta?: { label: string; href: string };
  secondary?: { label: string; href: string };
  /** Small print under the button. */
  note?: string;
  /** Pre-escaped quote block (inquiry replies). */
  quote?: string;
  /** Sign-off card with Dr. Oparaji's photo. */
  signed?: boolean;
};

const join = (id: string) => `/portal/visits/${id}/precheck`;
const BEFORE_YOU_JOIN = ["Use Chrome, Safari or Edge on a phone or computer", "Allow camera and microphone access when asked", "Find a quiet, private spot with a good connection"];

function content(t: EmailTemplate): Content {
  switch (t.template) {
    case "verify":
      return {
        subject: "Your verification code",
        preheader: `Your code is ${t.code}. It works for 15 minutes.`,
        badge: { label: "Verify your email", tone: "info" },
        heading: "Confirm it's you",
        paragraphs: ["Enter this code on the screen where you signed up to confirm your email address."],
        code: t.code,
        note: "The code works for 15 minutes. If you did not create an account, you can safely ignore this email.",
      };
    case "welcome":
      return {
        subject: "Welcome to Dr. Oparaji's virtual practice",
        preheader: "Your account is ready. Here is how to get started.",
        badge: { label: "Welcome", tone: "success" },
        heading: `Welcome, ${t.name}`,
        paragraphs: ["I'm so glad you're here. Your account is ready, and getting started takes just a few minutes."],
        steps: [
          { title: "Complete your health profile", body: "Your history and goals help us make the most of your first visit." },
          { title: "Book a video visit", body: "Pick a time that suits you. The intro call is free." },
          { title: "Join from your phone or computer", body: "No downloads. Your visit opens right in the browser." },
        ],
        cta: { label: "Complete your health profile", href: "/portal/health-profile" },
        secondary: { label: "Or book a visit now", href: "/portal/book" },
        signed: true,
      };
    case "reset_password":
      return {
        subject: "Reset your password",
        preheader: "Use this link to choose a new password. It expires in one hour.",
        badge: { label: "Account security", tone: "info" },
        heading: "Reset your password",
        paragraphs: ["We received a request to reset the password for your account. Choose a new one with the button below."],
        cta: { label: "Choose a new password", href: `/reset-password?token=${encodeURIComponent(t.token)}` },
        note: "The link works once and expires in one hour. If you did not ask for this, ignore this email and your password will stay the same.",
      };
    case "password_changed":
      return {
        subject: "Your password was changed",
        preheader: "The password for your account was just changed.",
        badge: { label: "Account security", tone: "warning" },
        heading: "Your password was changed",
        paragraphs: ["The password for your account was just changed, and your other devices were signed out.", "If this was you, there's nothing else to do. If it wasn't, reset your password right away and contact the practice."],
        cta: { label: "Reset password", href: "/forgot-password" },
      };

    case "booking_confirmed":
      return {
        subject: "Booking confirmed",
        preheader: `${t.visitType} with Dr. Oparaji · ${t.slot.when}`,
        badge: { label: "Booking confirmed", tone: "success" },
        heading: "You're all set",
        paragraphs: ["Your video visit with Dr. Oparaji is booked. You can join from your portal a few minutes before the start time."],
        slot: { slot: t.slot, title: t.visitType, lines: [t.slot.time, "Video visit · join from your portal"] },
        checklist: { title: "Before you join", items: BEFORE_YOU_JOIN },
        cta: { label: "View my visit", href: `/portal/visits?id=${t.id}` },
        secondary: { label: "Add to calendar", href: `/api/visits/${t.id}/ics` },
        note: "Need to change it? You can reschedule or cancel from your portal up to 12 hours before.",
      };
    case "visit_cancelled":
      return {
        subject: "Visit cancelled",
        preheader: `Your ${t.visitType} on ${t.when} was cancelled.`,
        badge: { label: "Visit cancelled", tone: "alert" },
        heading: "Your visit was cancelled",
        paragraphs: [`Your ${t.visitType} on ${t.when} was cancelled.`, ...(t.refunded ? [`We've refunded ${t.refunded} to your original payment method. It usually arrives in 3 to 5 business days.`] : []), "Whenever you're ready, you can book a new time."],
        cta: { label: "Book another time", href: "/portal/book" },
      };
    case "visit_rescheduled":
      return {
        subject: "Visit rescheduled",
        preheader: `New time: ${t.slot.when}`,
        badge: { label: "New time", tone: "info" },
        heading: "Your visit has a new time",
        paragraphs: ["Your visit was moved. Here are the updated details."],
        slot: { slot: t.slot, title: t.visitType, lines: [t.slot.time, "Video visit · join from your portal"] },
        cta: { label: "View my visit", href: `/portal/visits?id=${t.id}` },
        secondary: { label: "Update my calendar", href: `/api/visits/${t.id}/ics` },
      };
    case "reminder_24h":
      return {
        subject: "Reminder: your visit is tomorrow",
        preheader: `${t.visitType} with Dr. Oparaji · ${t.slot.when}`,
        badge: { label: "Tomorrow", tone: "info" },
        heading: "See you tomorrow",
        paragraphs: ["A quick reminder of your upcoming video visit with Dr. Oparaji."],
        slot: { slot: t.slot, title: t.visitType, lines: [t.slot.time, "Video visit · join from your portal"] },
        checklist: { title: "Before you join", items: BEFORE_YOU_JOIN },
        cta: { label: "View my visit", href: `/portal/visits?id=${t.id}` },
      };
    case "reminder_1h":
      return {
        subject: "Your visit starts in 1 hour",
        preheader: `${t.visitType} · ${t.slot.when}`,
        badge: { label: "Starting soon", tone: "warning" },
        heading: "Your visit starts in about an hour",
        paragraphs: ["The room opens a few minutes before the start time. You can check your camera and microphone first."],
        slot: { slot: t.slot, title: t.visitType, lines: [t.slot.time, "Video visit"] },
        cta: { label: "Check devices and join", href: join(t.id) },
      };
    case "no_show":
      return {
        subject: "We missed you",
        preheader: `You did not join your visit on ${t.when}.`,
        badge: { label: "Missed visit", tone: "alert" },
        heading: "We missed you today",
        paragraphs: [`You didn't join your visit on ${t.when}. Life happens. When you're ready, you can book a new time.`],
        cta: { label: "Book again", href: "/portal/book" },
        signed: true,
      };
    case "care_plan_published":
      return {
        subject: "Your care plan is ready",
        preheader: "Dr. Oparaji published your care plan.",
        badge: { label: "Care plan", tone: "success" },
        heading: "Your care plan is ready",
        paragraphs: ["I've published your care plan from our recent visit. It covers your goals and next steps.", "For your privacy, health details are only available in your secure portal."],
        cta: { label: "Read my care plan", href: `/portal/care-plans/${t.id}` },
        signed: true,
      };

    case "doctor_new_booking":
      return {
        subject: `New booking: ${t.patient}`,
        preheader: `${t.visitType} · ${t.slot.when}`,
        badge: { label: "New booking", tone: "success" },
        heading: `${t.patient} booked a visit`,
        paragraphs: [],
        slot: { slot: t.slot, title: t.patient, lines: [t.visitType, t.slot.time] },
        cta: { label: "Open appointment", href: `/doctor/appointments?id=${t.id}` },
      };
    case "doctor_visit_cancelled":
      return {
        subject: `Cancelled: ${t.patient}, ${t.when}`,
        preheader: `${t.patient} cancelled their ${t.visitType}.`,
        badge: { label: "Cancelled", tone: "alert" },
        heading: "A visit was cancelled",
        paragraphs: [`${t.patient} cancelled their ${t.visitType} on ${t.when}. The time is open for booking again.`],
        cta: { label: "View schedule", href: "/doctor/appointments" },
      };
    case "doctor_visit_rescheduled":
      return {
        subject: `Rescheduled: ${t.patient}`,
        preheader: `New time: ${t.slot.when}`,
        badge: { label: "Rescheduled", tone: "info" },
        heading: `${t.patient} moved their visit`,
        paragraphs: [],
        slot: { slot: t.slot, title: t.patient, lines: [t.visitType, t.slot.time] },
        cta: { label: "Open appointment", href: `/doctor/appointments?id=${t.id}` },
      };
    case "doctor_patient_waiting":
      return {
        subject: `${t.patient} is in the waiting room`,
        preheader: `${t.visitType} · ready to be admitted`,
        badge: { label: "Waiting room", tone: "warning" },
        heading: "Your patient is waiting",
        paragraphs: [`${t.patient} has checked their devices and is in the waiting room for their ${t.visitType}.`],
        cta: { label: "Open waiting room", href: `/doctor/visits/${t.id}/waiting` },
      };

    case "new_message":
      return {
        subject: "New message from Dr. Oparaji",
        preheader: "You have a new secure message in your portal.",
        badge: { label: "Secure message", tone: "info" },
        heading: "You have a new message",
        paragraphs: ["I've sent you a message. For your privacy, messages can only be read in your secure portal."],
        cta: { label: "Read message", href: "/portal/messages" },
        signed: true,
      };
    case "doctor_new_message":
      return {
        subject: `New message from ${t.patient}`,
        preheader: "A patient sent you a secure message.",
        badge: { label: "Patient message", tone: "info" },
        heading: `${t.patient} sent you a message`,
        paragraphs: ["Open the doctor portal to read and reply."],
        cta: { label: "Open conversation", href: `/doctor/messages?c=${t.conversationId}` },
      };

    case "receipt":
      return {
        subject: `Receipt ${t.receiptNo}`,
        preheader: `We received ${t.amount}. Thank you.`,
        badge: { label: "Payment received", tone: "success" },
        heading: "Thank you for your payment",
        paragraphs: [],
        amount: { value: t.amount, label: t.description, status: "Paid" },
        details: [
          ["Receipt", t.receiptNo],
          ["Date", t.date],
          ["Paid with", t.method],
        ],
        cta: { label: "View receipt", href: `/portal/billing/${t.id}` },
        note: "Keep this email for your records. You can download receipts any time from Billing in your portal.",
      };
    case "refund":
      return {
        subject: "Refund issued",
        preheader: `${t.amount} is on its way back to you.`,
        badge: { label: "Refund issued", tone: "success" },
        heading: "Your refund is on its way",
        paragraphs: ["It usually arrives in 3 to 5 business days, depending on your bank."],
        amount: { value: t.amount, label: t.description, status: "Refunded" },
        details: [
          ["Reference", t.reference],
          ["Refunded to", t.method],
        ],
        cta: { label: "View refund", href: `/portal/billing/refunds/${t.id}` },
      };
    case "payment_failed":
      return {
        subject: "Action needed: your payment didn't go through",
        preheader: `Update your card to keep ${t.plan}.`,
        badge: { label: "Action needed", tone: "alert" },
        heading: "Your payment didn't go through",
        paragraphs: [`We couldn't take the monthly payment for your ${t.plan} membership. Your plan stays active for 3 more days.`, "Update your card so you keep your included visits and member rate."],
        cta: { label: "Update payment method", href: "/portal/settings/payment-methods" },
      };
    case "membership_ended":
      return {
        subject: `Your ${t.plan} membership has ended`,
        preheader: "You can still book visits at the standard price.",
        badge: { label: "Membership", tone: "warning" },
        heading: "Your membership has ended",
        paragraphs: [`Your ${t.plan} membership has ended. You can still book visits at the standard price, or rejoin any time.`],
        cta: { label: "View membership options", href: "/portal/membership" },
      };

    case "inquiry_received":
      return {
        subject: "We received your message",
        preheader: "Thanks for getting in touch. We usually reply within 2 business days.",
        badge: { label: "Message received", tone: "success" },
        heading: `Thanks, ${t.name}`,
        paragraphs: [`We received your message about “${t.topic}”. The practice usually replies within 2 business days.`],
        note: "Please don't send medical questions or personal health details by email. If you're a patient, use secure messaging in your portal.",
      };
    case "doctor_new_inquiry":
      return {
        subject: `New inquiry: ${t.topic}`,
        preheader: `From ${t.name}`,
        badge: { label: "Website inquiry", tone: "info" },
        heading: "New inquiry from the website",
        paragraphs: [],
        details: [
          ["From", t.name],
          ["Topic", t.topic],
        ],
        cta: { label: "Open inquiry", href: `/doctor/inquiries/${t.id}` },
      };
    case "inquiry_reply":
      return {
        subject: "Reply from Dr. Oparaji's practice",
        preheader: t.body.slice(0, 90),
        badge: { label: "Reply", tone: "info" },
        heading: t.name ? `Hello ${t.name},` : "Hello,",
        paragraphs: [],
        quote: esc(t.body).replace(/\n/g, "<br>"),
        note: "You can reply to this email. Please don't include personal health details.",
        signed: true,
      };
  }
}

// ─── Layout ──────────────────────────────────────────────────────────────────

const C = {
  forest: "#17604B",
  deep: "#0F4636",
  ink: "#0C111B",
  body: "#3F4753",
  muted: "#6B7280",
  line: "#E7E5DD",
  paper: "#F3F1EA",
  sage: "#E7F2ED",
  sageLine: "#CFE2D8",
  sageInk: "#33473F",
  gold: "#E6A93B",
  goldTint: "#FCF1D9",
  goldInk: "#8A5A06",
  coralTint: "#FCE9E3",
  coralInk: "#B8442A",
  skyTint: "#E6EEFB",
  skyInk: "#2A4F9E",
};
const TONE: Record<Tone, { bg: string; fg: string }> = {
  success: { bg: C.sage, fg: C.forest },
  info: { bg: C.skyTint, fg: C.skyInk },
  warning: { bg: C.goldTint, fg: C.goldInk },
  alert: { bg: C.coralTint, fg: C.coralInk },
};
const SANS = "Manrope,'Segoe UI',Helvetica,Arial,sans-serif";
const SERIF = "Newsreader,Georgia,'Times New Roman',serif";

export function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const CSS = `
:root{color-scheme:light;supported-color-schemes:light}
body{margin:0;padding:0;width:100%!important;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
table{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0}
img{border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic}
a{color:${C.forest}}
.btn a:hover{background:${C.deep}!important}
@media only screen and (max-width:620px){
  .wrap{padding:0!important}
  .container{width:100%!important;border-radius:0!important}
  .px{padding-left:22px!important;padding-right:22px!important}
  .hero{padding:30px 22px 28px!important;border-radius:0!important}
  .h1{font-size:27px!important;line-height:1.2!important}
  .lead{font-size:15px!important}
  .code td.d{width:38px!important;height:50px!important;font-size:24px!important}
  .amount{font-size:38px!important}
  .tile-date{width:76px!important}
  .tile-day{font-size:30px!important}
  .btn,.btn td,.btn a{display:block!important;width:100%!important;box-sizing:border-box;text-align:center!important}
  .foot{padding-left:22px!important;padding-right:22px!important}
  .hide-sm{display:none!important}
}`;

export type Rendered = { subject: string; html: string; text: string };

/** Render one email. `appUrl` is the absolute site origin (APP_URL). */
export function renderEmail(t: EmailTemplate, audience: Audience, appUrl: string): Rendered {
  const c = content(t);
  const origin = appUrl.replace(/\/$/, "");
  const market = audience.kind === "doctor" ? "us" : (audience.market ?? "us");
  const abs = (href: string) => (/^https?:/.test(href) ? href : origin + (audience.kind === "patient" ? withMarket(href, market) : href));
  const emergency =
    audience.kind === "doctor"
      ? null
      : audience.kind === "patient" || audience.market
        ? `Virtual care is not for emergencies. If you think you are having one, ${MARKETS[market].emergencyLine}.`
        : "Virtual care is not for emergencies. In the US call 911; in Nigeria call 112 or 767.";
  const footerLinks =
    audience.kind === "patient"
      ? [
          { label: "My portal", href: abs("/portal") },
          { label: "Email preferences", href: abs("/portal/settings") },
          { label: "Help", href: abs("/faq") },
        ]
      : audience.kind === "doctor"
        ? [{ label: "Doctor portal", href: abs("/doctor") }]
        : [
            { label: "Website", href: abs("/") },
            { label: "Services", href: abs("/services") },
            { label: "FAQ", href: abs("/faq") },
          ];
  const tone = TONE[c.badge.tone];

  const para = (s: string) => `<p class="lead" style="margin:0 0 16px;font-family:${SANS};font-size:16px;line-height:1.65;color:${C.body}">${esc(s)}</p>`;

  const button = (b: { label: string; href: string }) => `
<table role="presentation" class="btn" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 0">
  <tr><td align="center" bgcolor="${C.forest}" style="border-radius:999px;background:${C.forest}">
    <a href="${esc(abs(b.href))}" target="_blank" style="display:inline-block;padding:15px 32px;font-family:${SANS};font-size:15px;font-weight:800;line-height:1;color:#ffffff;text-decoration:none;border-radius:999px;background:${C.forest}">${esc(b.label)}&nbsp;&nbsp;&rarr;</a>
  </td></tr>
</table>`;

  const codeBlock = (code: string) => `
<table role="presentation" class="code" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:4px auto 22px;border-collapse:separate">
  <tr>${code
    .split("")
    .map(
      (d, i) =>
        `${i === 3 ? `<td style="width:12px"></td>` : ""}<td class="d" align="center" valign="middle" style="width:48px;height:60px;border:1.5px solid ${C.sageLine};border-radius:12px;background:${C.sage};font-family:${SANS};font-size:30px;font-weight:800;color:${C.ink}">${esc(d)}</td><td style="width:6px"></td>`,
    )
    .join("")}</tr>
</table>`;

  const slotTile = (s: NonNullable<Content["slot"]>) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 22px;border:1px solid ${C.line};border-radius:18px;border-collapse:separate;overflow:hidden">
  <tr>
    <td class="tile-date" width="92" align="center" valign="middle" bgcolor="${C.forest}" style="width:92px;background:${C.forest};padding:16px 6px;border-radius:17px 0 0 17px">
      <div style="font-family:${SANS};font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#CFE2D8">${esc(s.slot.month)}</div>
      <div class="tile-day" style="font-family:${SERIF};font-size:36px;line-height:1.1;color:#ffffff">${esc(s.slot.day)}</div>
      <div style="font-family:${SANS};font-size:12px;font-weight:700;color:#CFE2D8">${esc(s.slot.weekday)}</div>
    </td>
    <td valign="middle" style="padding:16px 20px;background:#ffffff">
      <div style="font-family:${SERIF};font-size:21px;line-height:1.25;color:${C.ink}">${esc(s.title)}</div>
      ${s.lines.map((l, i) => `<div style="margin-top:4px;font-family:${SANS};font-size:14px;${i === 0 ? `font-weight:700;color:${C.forest}` : `color:${C.muted}`}">${esc(l)}</div>`).join("")}
    </td>
  </tr>
</table>`;

  const amountBlock = (a: NonNullable<Content["amount"]>) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px">
  <tr><td align="center" bgcolor="${C.sage}" style="background:${C.sage};border-radius:18px;padding:26px 20px">
    <div style="display:inline-block;padding:5px 12px;border-radius:999px;background:#ffffff;font-family:${SANS};font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:${C.forest}">&#10003;&nbsp; ${esc(a.status)}</div>
    <div class="amount" style="margin-top:12px;font-family:${SERIF};font-size:46px;line-height:1.05;color:${C.ink}">${esc(a.value)}</div>
    <div style="margin-top:6px;font-family:${SANS};font-size:14px;color:${C.sageInk}">${esc(a.label)}</div>
  </td></tr>
</table>`;

  const detailsTable = (rows: [string, string][]) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 22px">
  ${rows
    .map(
      ([k, v], i) =>
        `<tr><td style="padding:12px 0;${i ? `border-top:1px solid ${C.line};` : ""}font-family:${SANS};font-size:13px;color:${C.muted};width:38%;vertical-align:top">${esc(k)}</td><td align="right" style="padding:12px 0;${i ? `border-top:1px solid ${C.line};` : ""}font-family:${SANS};font-size:15px;font-weight:700;color:${C.ink}">${esc(v)}</td></tr>`,
    )
    .join("")}
</table>`;

  const stepsList = (steps: NonNullable<Content["steps"]>) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 24px">
  ${steps
    .map(
      (s, i) => `<tr>
    <td width="44" valign="top" style="width:44px;padding:0 0 18px">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" valign="middle" bgcolor="${C.goldTint}" style="width:32px;height:32px;border-radius:999px;background:${C.goldTint};font-family:${SERIF};font-size:17px;color:${C.goldInk}">${i + 1}</td></tr></table>
    </td>
    <td valign="top" style="padding:3px 0 18px">
      <div style="font-family:${SANS};font-size:15px;font-weight:800;color:${C.ink}">${esc(s.title)}</div>
      <div style="margin-top:3px;font-family:${SANS};font-size:14px;line-height:1.55;color:${C.muted}">${esc(s.body)}</div>
    </td>
  </tr>`,
    )
    .join("")}
</table>`;

  const checklist = (cl: NonNullable<Content["checklist"]>) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;border-collapse:separate">
  <tr><td bgcolor="#FAF9F5" style="background:#FAF9F5;border:1px solid ${C.line};border-radius:16px;padding:18px 20px">
    <div style="font-family:${SANS};font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:${C.muted};margin-bottom:10px">${esc(cl.title)}</div>
    ${cl.items
      .map(
        (it) =>
          `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0"><tr><td valign="top" style="width:26px;font-family:${SANS};font-size:14px;font-weight:800;color:${C.forest}">&#10003;</td><td style="font-family:${SANS};font-size:14px;line-height:1.5;color:${C.body}">${esc(it)}</td></tr></table>`,
      )
      .join("")}
  </td></tr>
</table>`;

  const signature = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 0;border-top:1px solid ${C.line}">
  <tr>
    <td width="68" valign="middle" style="width:68px;padding-top:22px"><img src="${origin}/email/dr-oparaji.jpg" width="56" height="56" alt="Dr. Nneoma Oparaji" style="display:block;width:56px;height:56px;border-radius:999px"></td>
    <td valign="middle" style="padding-top:22px">
      <div style="font-family:${SERIF};font-size:19px;color:${C.ink}">Dr. Nneoma Oparaji, MD</div>
      <div style="margin-top:2px;font-family:${SANS};font-size:13px;color:${C.muted}">Internal, Obesity &amp; Lifestyle Medicine</div>
    </td>
  </tr>
</table>`;

  const html = `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(c.subject)}</title>
<!--[if !mso]><!--><link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Newsreader:opsz,wght@6..72,400;6..72,500&display=swap" rel="stylesheet"><!--<![endif]-->
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<style>${CSS}</style>
</head>
<body style="margin:0;padding:0;background:${C.paper}">
<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:${C.paper}">${esc(c.preheader)}${"&#8199;&#65279;&#847;".repeat(40)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.paper}" style="background:${C.paper}">
<tr><td class="wrap" align="center" style="padding:32px 12px">
  <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
  <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:24px;border-collapse:separate;overflow:hidden">

    <!-- Header -->
    <tr><td class="hero" bgcolor="${C.deep}" style="background:${C.deep};padding:32px 40px 34px;border-radius:24px 24px 0 0">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td valign="middle" width="56" style="width:56px">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" valign="middle" bgcolor="#ffffff" style="width:48px;height:40px;border-radius:12px;background:#ffffff"><img src="${origin}/email/nd-mark.png" width="38" height="27" alt="ND" style="display:block;width:38px;height:auto;margin:0 auto"></td></tr></table>
          </td>
          <td valign="middle" style="padding-left:4px">
            <div style="font-family:${SERIF};font-size:18px;line-height:1.2;color:#ffffff">Dr. Nneoma Oparaji</div>
            <div style="font-family:${SANS};font-size:10px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:${C.gold}">Virtual care</div>
          </td>
        </tr>
      </table>
      <div style="height:30px;line-height:30px;font-size:0">&nbsp;</div>
      <span style="display:inline-block;padding:6px 13px;border-radius:999px;background:${tone.bg};font-family:${SANS};font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:${tone.fg}">${esc(c.badge.label)}</span>
      <h1 class="h1" style="margin:14px 0 0;font-family:${SERIF};font-weight:400;font-size:34px;line-height:1.15;color:#ffffff">${esc(c.heading)}</h1>
    </td></tr>
    <tr><td style="height:5px;line-height:5px;font-size:0;background:${C.gold}" bgcolor="${C.gold}">&nbsp;</td></tr>

    <!-- Body -->
    <tr><td class="px" style="padding:34px 40px 36px">
      ${c.paragraphs.map(para).join("")}
      ${c.code ? codeBlock(c.code) : ""}
      ${c.amount ? amountBlock(c.amount) : ""}
      ${c.slot ? slotTile(c.slot) : ""}
      ${c.quote ? `<div style="margin:0 0 22px;padding:18px 20px;border-left:4px solid ${C.gold};background:#FAF9F5;border-radius:0 14px 14px 0;font-family:${SANS};font-size:16px;line-height:1.65;color:${C.ink}">${c.quote}</div>` : ""}
      ${c.details ? detailsTable(c.details) : ""}
      ${c.steps ? stepsList(c.steps) : ""}
      ${c.checklist ? checklist(c.checklist) : ""}
      ${c.cta ? button(c.cta) : ""}
      ${c.secondary ? `<p style="margin:16px 0 0;font-family:${SANS};font-size:14px"><a href="${esc(abs(c.secondary.href))}" target="_blank" style="color:${C.forest};font-weight:800;text-decoration:none">${esc(c.secondary.label)} &rsaquo;</a></p>` : ""}
      ${c.note ? `<p style="margin:24px 0 0;font-family:${SANS};font-size:13px;line-height:1.6;color:${C.muted}">${esc(c.note)}</p>` : ""}
      ${c.signed ? signature : ""}
      ${c.cta ? `<p class="hide-sm" style="margin:26px 0 0;font-family:${SANS};font-size:12px;line-height:1.5;color:#9CA3AF">Button not working? Paste this link into your browser:<br><a href="${esc(abs(c.cta.href))}" style="color:${C.muted};word-break:break-all">${esc(abs(c.cta.href))}</a></p>` : ""}
    </td></tr>
  </table>
  <!--[if mso]></td></tr></table><![endif]-->

  <!-- Footer -->
  <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px">
    ${
      emergency
        ? `<tr><td class="foot" style="padding:18px 8px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate"><tr><td bgcolor="${C.goldTint}" style="background:${C.goldTint};border:1px solid #F1DFAF;border-radius:14px;padding:12px 16px;font-family:${SANS};font-size:12.5px;line-height:1.5;color:#5B4210;text-align:center">&#9888;&#65039;&nbsp; ${esc(emergency)}</td></tr></table></td></tr>`
        : ""
    }
    <tr><td class="foot" align="center" style="padding:22px 24px 8px;font-family:${SANS};font-size:13px;line-height:1.7;color:${C.muted}">
      ${footerLinks.map((l) => `<a href="${esc(l.href)}" target="_blank" style="color:${C.forest};font-weight:700;text-decoration:none">${esc(l.label)}</a>`).join(`<span style="color:#C9C6BC">&nbsp;&nbsp;·&nbsp;&nbsp;</span>`)}
    </td></tr>
    <tr><td class="foot" align="center" style="padding:6px 24px 12px;font-family:${SANS};font-size:12px;line-height:1.6;color:#9CA3AF">
      Dr. Nneoma Oparaji · Virtual-only practice<br>
      ${audience.kind === "patient" ? "You're receiving this because you have an account with the practice." : audience.kind === "doctor" ? "Sent to the care team." : "You're receiving this because you contacted the practice."}
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    `${c.badge.label.toUpperCase()}`,
    c.heading,
    "",
    ...c.paragraphs.flatMap((s) => [s, ""]),
    ...(c.code ? [`Your verification code is ${c.code}.`, ""] : []),
    ...(c.amount ? [`${c.amount.status}: ${c.amount.value} · ${c.amount.label}`, ""] : []),
    ...(c.slot ? [`${c.slot.title}`, `${c.slot.slot.when}`, ...c.slot.lines.slice(1), ""] : []),
    ...(t.template === "inquiry_reply" ? [t.body, ""] : []),
    ...(c.details ? [...c.details.map(([k, v]) => `${k}: ${v}`), ""] : []),
    ...(c.steps ? [...c.steps.map((s, i) => `${i + 1}. ${s.title}: ${s.body}`), ""] : []),
    ...(c.checklist ? [`${c.checklist.title}:`, ...c.checklist.items.map((i) => `- ${i}`), ""] : []),
    ...(c.cta ? [`${c.cta.label}: ${abs(c.cta.href)}`, ""] : []),
    ...(c.secondary ? [`${c.secondary.label}: ${abs(c.secondary.href)}`, ""] : []),
    ...(c.note ? [c.note, ""] : []),
    ...(c.signed ? ["Dr. Nneoma Oparaji, MD", ""] : []),
    ...(emergency ? [emergency, ""] : []),
    "Dr. Nneoma Oparaji · Virtual-only practice",
  ].join("\n");

  return { subject: c.subject, html, text };
}

// ─── Samples ─────────────────────────────────────────────────────────────────

const SLOT: Slot = { weekday: "Tue", day: "2", month: "Dec", time: "10:00 AM WAT", when: "Tue, Dec 2 · 10:00 AM WAT" };
const SLOT_DOC: Slot = { weekday: "Tue", day: "2", month: "Dec", time: "3:00 AM CST", when: "Tue, Dec 2 · 3:00 AM CST" };

/** Sample data for every template: used by the preview page and the test-send script. */
export const SAMPLES: { t: EmailTemplate; audience: Audience["kind"] }[] = [
  { t: { template: "verify", code: "482913" }, audience: "patient" },
  { t: { template: "welcome", name: "Adaeze" }, audience: "patient" },
  { t: { template: "reset_password", token: "sample-token" }, audience: "patient" },
  { t: { template: "password_changed" }, audience: "patient" },
  { t: { template: "booking_confirmed", slot: SLOT, visitType: "Follow-up visit", id: "sample" }, audience: "patient" },
  { t: { template: "visit_rescheduled", slot: { ...SLOT, day: "4", weekday: "Thu", time: "2:30 PM WAT", when: "Thu, Dec 4 · 2:30 PM WAT" }, visitType: "Follow-up visit", id: "sample" }, audience: "patient" },
  { t: { template: "visit_cancelled", when: "Tue, Dec 2 · 10:00 AM WAT", visitType: "Follow-up visit", refunded: "$95.00" }, audience: "patient" },
  { t: { template: "reminder_24h", slot: SLOT, visitType: "Follow-up visit", id: "sample" }, audience: "patient" },
  { t: { template: "reminder_1h", slot: SLOT, visitType: "Follow-up visit", id: "sample" }, audience: "patient" },
  { t: { template: "no_show", when: "Tue, Dec 2 · 10:00 AM WAT" }, audience: "patient" },
  { t: { template: "care_plan_published", id: "sample" }, audience: "patient" },
  { t: { template: "new_message" }, audience: "patient" },
  { t: { template: "receipt", amount: "$95.00", description: "Follow-up visit", receiptNo: "NO-2026-0412", method: "Visa ending 4242", date: "19 Nov 2026", id: "sample" }, audience: "patient" },
  { t: { template: "refund", amount: "$95.00", description: "Follow-up visit", reference: "RF-2026-0091", method: "Visa ending 4242", id: "sample" }, audience: "patient" },
  { t: { template: "payment_failed", plan: "Thrive" }, audience: "patient" },
  { t: { template: "membership_ended", plan: "Thrive" }, audience: "patient" },
  { t: { template: "doctor_new_booking", patient: "Adaeze O.", visitType: "Follow-up visit", slot: SLOT_DOC, id: "sample" }, audience: "doctor" },
  { t: { template: "doctor_visit_rescheduled", patient: "Adaeze O.", visitType: "Follow-up visit", slot: { ...SLOT_DOC, day: "4", weekday: "Thu", time: "7:30 AM CST", when: "Thu, Dec 4 · 7:30 AM CST" }, id: "sample" }, audience: "doctor" },
  { t: { template: "doctor_visit_cancelled", patient: "Adaeze O.", visitType: "Follow-up visit", when: "Tue, Dec 2 · 3:00 AM CST" }, audience: "doctor" },
  { t: { template: "doctor_patient_waiting", patient: "Adaeze O.", visitType: "Follow-up visit", id: "sample" }, audience: "doctor" },
  { t: { template: "doctor_new_message", patient: "Adaeze O.", conversationId: "sample" }, audience: "doctor" },
  { t: { template: "doctor_new_inquiry", name: "Jane Doe", topic: "Speaking invitation", id: "sample" }, audience: "doctor" },
  { t: { template: "inquiry_received", name: "Jane", topic: "Speaking invitation" }, audience: "public" },
  { t: { template: "inquiry_reply", name: "Jane", body: "Thank you for reaching out.\nDr. Oparaji would be glad to speak at your event. Could you share the date and format?" }, audience: "public" },
];
