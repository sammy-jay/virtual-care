import "server-only";
import { chargeAndRecord } from "@/lib/billing";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { notify } from "@/lib/notify";
import { addMonths, fmtWhen } from "@/lib/time";

/** Runs every few minutes from /api/cron/tick. Each step is idempotent. */
export async function runJobs(now = new Date()) {
  const out = { reminders24: 0, reminders1: 0, releasedHolds: 0, renewed: 0, failedRenewals: 0, ended: 0, lapsed: 0 };

  // 24 h and 1 h reminders (05.10, 08.2)
  const soon = await db.appointment.findMany({
    where: { status: "SCHEDULED", startsAt: { gt: now, lte: new Date(now.getTime() + 24 * 3600_000) }, OR: [{ reminder24Sent: false }, { reminder1Sent: false }] },
    include: { patient: true, visitType: true },
  });
  for (const a of soon) {
    if (!a.patient) continue;
    const wantsReminders = a.patient.notifyPrefs?.visitReminders !== false;
    const mins = (a.startsAt.getTime() - now.getTime()) / 60000;
    if (!a.reminder24Sent && mins > 60) {
      if (wantsReminders) await sendEmail(a.patient.email, { template: "reminder_24h", when: fmtWhen(a.startsAt, a.patient.timeZone) });
      await notify(a.patient.id, { category: "VISITS", title: "Visit reminder", body: `${a.visitType.name} with Dr. Oparaji · ${fmtWhen(a.startsAt, a.patient.timeZone)}`, href: "/portal/visits" });
      await db.appointment.update({ where: { id: a.id }, data: { reminder24Sent: true } });
      out.reminders24++;
    }
    if (!a.reminder1Sent && mins <= 60) {
      if (wantsReminders) await sendEmail(a.patient.email, { template: "reminder_1h", id: a.id });
      await db.appointment.update({ where: { id: a.id }, data: { reminder1Sent: true, reminder24Sent: true } });
      out.reminders1++;
    }
  }

  // Unpaid bookings hold a slot for 30 minutes.
  const holds = await db.appointment.updateMany({ where: { status: "PENDING_PAYMENT", createdAt: { lt: new Date(now.getTime() - 30 * 60_000) } }, data: { status: "CANCELED", canceledAt: now } });
  out.releasedHolds = holds.count;

  // Membership period end: cancel, renew, or lapse after the 3-day grace (06.7, 06.10).
  const due = await db.membership.findMany({ where: { status: { in: ["ACTIVE", "PAST_DUE"] }, currentPeriodEnd: { lte: now } }, include: { plan: true, patient: true } });
  for (const m of due) {
    if (m.cancelAtPeriodEnd) {
      await db.membership.update({ where: { id: m.id }, data: { status: "CANCELED" } });
      out.ended++;
      continue;
    }
    if (m.status === "PAST_DUE" && m.graceUntil && m.graceUntil > now) continue;
    if (m.status === "PAST_DUE" && m.graceUntil && m.graceUntil <= now) {
      await db.membership.update({ where: { id: m.id }, data: { status: "CANCELED", canceledAt: now } });
      await notify(m.patientId, { category: "BILLING", title: `${m.plan.name} ended`, body: "We could not take payment, so your plan has ended.", href: "/portal/membership" });
      out.lapsed++;
      continue;
    }
    const amount = m.currency === "NGN" ? m.plan.monthlyPriceNgn * 100 : m.plan.monthlyPriceCents;
    const r = m.paymentMethodId
      ? await chargeAndRecord({ patientId: m.patientId, paymentMethodId: m.paymentMethodId, amountCents: amount, currency: m.currency, kind: "MEMBERSHIP", description: `${m.plan.name} monthly`, membershipId: m.id })
      : { ok: false as const };
    if (r.ok) {
      await db.membership.update({ where: { id: m.id }, data: { status: "ACTIVE", graceUntil: null, currentPeriodStart: m.currentPeriodEnd, currentPeriodEnd: addMonths(m.currentPeriodEnd, 1) } });
      out.renewed++;
    } else {
      await db.membership.update({ where: { id: m.id }, data: { status: "PAST_DUE", graceUntil: new Date(now.getTime() + 3 * 86400_000) } });
      await notify(m.patientId, { category: "BILLING", title: "Payment failed", body: `Payment for ${m.plan.name} did not go through. Update your card within 3 days.`, href: "/portal/settings/payment-methods" });
      out.failedRenewals++;
    }
  }
  return out;
}
