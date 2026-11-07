import "server-only";
import { db } from "@/lib/db";

/**
 * Notification emails (board 08.2). They never contain clinical content.
 * EMAIL_PROVIDER=console logs and stores in EmailOutbox; =resend sends via the Resend HTTP API.
 */
type Template =
  | { template: "welcome"; name: string }
  | { template: "verify"; code: string }
  | { template: "booking_confirmed"; when: string }
  | { template: "doctor_new_booking"; patient: string; type: string; when: string; id: string }
  | { template: "visit_cancelled"; when: string }
  | { template: "reset_password"; url: string }
  | { template: "reminder_24h"; when: string }
  | { template: "reminder_1h"; id: string }
  | { template: "new_message" }
  | { template: "care_plan_published" }
  | { template: "receipt"; amount: string; description: string }
  | { template: "refund"; amount: string }
  | { template: "visit_rescheduled"; when: string }
  | { template: "no_show"; when: string }
  | { template: "inquiry_reply"; body: string };

const APP = () => process.env.APP_URL ?? "http://localhost:3000";

function render(t: Template): { subject: string; line: string; cta?: { label: string; href: string } } {
  switch (t.template) {
    case "welcome":
      return { subject: "Welcome", line: `Welcome, ${t.name}. Complete your health profile to get started.`, cta: { label: "Complete profile", href: "/portal/health-profile" } };
    case "verify":
      return { subject: "Your verification code", line: `Your code is ${t.code}. It works for 15 minutes.` };
    case "booking_confirmed":
      return { subject: "Booking confirmed", line: `Your visit is booked: ${t.when}.`, cta: { label: "View visit", href: "/portal/visits" } };
    case "doctor_new_booking":
      return { subject: "New booking", line: `${t.patient} booked ${t.type} on ${t.when}.`, cta: { label: "Open appointment", href: `/doctor/appointments?id=${t.id}` } };
    case "visit_cancelled":
      return { subject: "Visit cancelled", line: `Your visit on ${t.when} was cancelled.`, cta: { label: "Book again", href: "/portal/book" } };
    case "reset_password":
      return { subject: "Reset your password", line: "This link works once and expires in one hour.", cta: { label: "Reset password", href: t.url } };
    case "reminder_24h":
      return { subject: "Reminder: tomorrow", line: `Your visit is in 24 hours: ${t.when}.`, cta: { label: "View visit", href: "/portal/visits" } };
    case "reminder_1h":
      return { subject: "Starting soon", line: "Your visit starts in 1 hour.", cta: { label: "Join video visit", href: `/portal/visits/${t.id}/precheck` } };
    case "new_message":
      return { subject: "New message", line: "You have a new message. Sign in to read it.", cta: { label: "Sign in", href: "/sign-in" } };
    case "care_plan_published":
      return { subject: "Your care plan is ready", line: "Dr. Oparaji published your care plan. Sign in to read it.", cta: { label: "Sign in", href: "/portal/care-plans" } };
    case "receipt":
      return { subject: "Payment received", line: `We received ${t.amount} for ${t.description}.`, cta: { label: "View receipt", href: "/portal/billing" } };
    case "refund":
      return { subject: "Refund issued", line: `${t.amount} was refunded. It arrives in 3 to 5 business days.`, cta: { label: "View billing", href: "/portal/billing" } };
    case "visit_rescheduled":
      return { subject: "Visit rescheduled", line: `Your visit has a new time: ${t.when}.`, cta: { label: "View visit", href: "/portal/visits" } };
    case "no_show":
      return { subject: "We missed you", line: `You did not join your visit on ${t.when}.`, cta: { label: "Book again", href: "/portal/book" } };
    case "inquiry_reply":
      return { subject: "Reply from Dr. Oparaji's practice", line: t.body };
  }
}

function html(subject: string, line: string, cta?: { label: string; href: string }) {
  const href = cta ? (cta.href.startsWith("http") ? cta.href : APP() + cta.href) : "";
  return `<!doctype html><html><body style="margin:0;background:#F7F6F1;font-family:Manrope,Arial,sans-serif;color:#0C111B">
<div style="max-width:520px;margin:0 auto;padding:32px 16px"><div style="background:#fff;border:1px solid #E5E7EB;border-radius:20px;padding:28px">
<div style="font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#17604B">Dr. Oparaji · Virtual Care</div>
<h1 style="font-family:Georgia,serif;font-weight:400;font-size:26px;margin:14px 0 8px">${subject}</h1>
<p style="font-size:15px;line-height:1.5;color:#4B5563;margin:0">${line}</p>
${cta ? `<a href="${href}" style="display:inline-block;margin-top:20px;background:#17604B;color:#fff;font-weight:700;padding:13px 24px;border-radius:999px;text-decoration:none">${cta.label}</a>` : ""}
</div><p style="font-size:12px;color:#6B7280;text-align:center;margin-top:16px">Not for emergencies. Call 911 (US) or 112 (Nigeria).</p></div></body></html>`;
}

export async function sendEmail(to: string, t: Template) {
  const { subject, line, cta } = render(t);
  const body = html(subject, line, cta);
  const text = `${line}${cta ? `\n\n${cta.label}: ${cta.href.startsWith("http") ? cta.href : APP() + cta.href}` : ""}`;
  const row = await db.emailOutbox.create({ data: { to, subject, text, html: body, template: t.template } });

  if (process.env.EMAIL_PROVIDER === "resend" && process.env.RESEND_API_KEY) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject, html: body, text }),
      });
      if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
      await db.emailOutbox.update({ where: { id: row.id }, data: { sentAt: new Date() } });
    } catch (e) {
      await db.emailOutbox.update({ where: { id: row.id }, data: { error: String(e) } });
    }
  } else {
    console.info(`\n[email] to=${to} subject="${subject}"\n${text}\n`);
    await db.emailOutbox.update({ where: { id: row.id }, data: { sentAt: new Date() } });
  }
}
