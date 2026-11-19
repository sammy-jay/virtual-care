import "server-only";
import { db } from "@/lib/db";
import { fromDbMarket } from "@/lib/market";
import { renderEmail, type Audience, type EmailTemplate } from "./templates";
import { deliver } from "./transport";

export type { EmailTemplate } from "./templates";

const APP = () => process.env.APP_URL ?? "http://localhost:3000";

/** Patients get links and the emergency line for their own site; doctors get the doctor portal. */
async function audienceFor(email: string): Promise<Audience> {
  const user = await db.user.findUnique({ where: { email: email.toLowerCase() }, select: { role: true, market: true } });
  if (!user) return { kind: "public" };
  if (user.role !== "PATIENT") return { kind: "doctor" };
  return { kind: "patient", market: fromDbMarket(user.market) };
}

/**
 * Renders a template, keeps a copy in EmailOutbox (with any delivery error) and sends it.
 * Never throws: a mail-server problem must not break a booking or a sign-up.
 */
export async function sendEmail(to: string, t: EmailTemplate, opts: { audience?: Audience; replyTo?: string } = {}) {
  const audience = opts.audience ?? (await audienceFor(to));
  const { subject, html, text } = renderEmail(t, audience, APP());
  const row = await db.emailOutbox.create({ data: { to, subject, text, html, template: t.template } });
  try {
    await deliver({ to, subject, html, text, replyTo: opts.replyTo });
    await db.emailOutbox.update({ where: { id: row.id }, data: { sentAt: new Date() } });
  } catch (e) {
    console.error(`[email] ${t.template} to ${to} failed:`, e);
    await db.emailOutbox.update({ where: { id: row.id }, data: { error: String(e) } });
  }
}

/** Emails every doctor account. */
export async function emailDoctors(t: EmailTemplate) {
  const doctors = await db.user.findMany({ where: { role: "DOCTOR", deletedAt: null }, select: { email: true } });
  for (const d of doctors) await sendEmail(d.email, t, { audience: { kind: "doctor" } });
}
