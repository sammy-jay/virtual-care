import "server-only";
import type { Currency, PaymentKind } from "@prisma/client";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { money } from "@/lib/format";
import { notify, notifyDoctors } from "@/lib/notify";
import { charge, refund as providerRefund } from "@/lib/payments";

async function nextReceiptNo(prefix = "NO") {
  const year = new Date().getFullYear();
  const count = await db.payment.count({ where: { receiptNo: { startsWith: `${prefix}-${year}-` } } });
  return `${prefix}-${year}-${String(count + 401 + Math.floor(Math.random() * 9)).padStart(4, "0")}`;
}

/** Charge a saved method and record the Payment (PAID or FAILED). */
export async function chargeAndRecord(opts: {
  patientId: string;
  paymentMethodId: string;
  amountCents: number;
  currency: Currency;
  kind: PaymentKind;
  description: string;
  note?: string;
  appointmentId?: string;
  membershipId?: string;
}) {
  const pm = await db.paymentMethod.findFirstOrThrow({ where: { id: opts.paymentMethodId, userId: opts.patientId } });
  const r = await charge({ amountCents: opts.amountCents, currency: opts.currency, providerRef: pm.providerRef ?? "", description: opts.description });
  const payment = await db.payment.create({
    data: {
      patientId: opts.patientId,
      kind: opts.kind,
      status: r.ok ? "PAID" : "FAILED",
      amountCents: opts.amountCents,
      currency: opts.currency,
      description: opts.description,
      note: opts.note ?? `${pm.brand} ending ${pm.last4}`,
      receiptNo: await nextReceiptNo(),
      paymentMethodId: pm.id,
      provider: pm.provider,
      providerRef: r.ok ? r.ref : null,
      failureReason: r.ok ? null : r.reason,
      appointmentId: opts.appointmentId,
      membershipId: opts.membershipId,
    },
  });
  if (r.ok) {
    const patient = await db.user.findUniqueOrThrow({ where: { id: opts.patientId } });
    const amount = money(opts.amountCents, opts.currency);
    await sendEmail(patient.email, { template: "receipt", amount, description: opts.description });
    await notify(patient.id, { category: "BILLING", title: "Payment received", body: `${opts.description} · ${amount}`, href: `/portal/billing/${payment.id}` });
    await notifyDoctors({ category: "PAYMENTS", title: "Payment received", body: `${patient.name} · ${opts.description}`, amount, href: "/doctor/earnings" });
  }
  return { ok: r.ok, payment, reason: r.ok ? null : r.reason };
}

/** Refund all or part of a payment, record it, and tell the patient (06.8 / 10.9). */
export async function refundPayment(paymentId: string, amountCents: number, reason: string) {
  const p = await db.payment.findUniqueOrThrow({ where: { id: paymentId }, include: { patient: true } });
  const refundable = p.amountCents - p.refundedCents;
  if (p.status !== "PAID" && p.status !== "PARTIALLY_REFUNDED") throw new Error("Only paid payments can be refunded.");
  const amt = Math.min(Math.max(1, amountCents), refundable);
  const r = await providerRefund({ chargeRef: p.providerRef ?? "", amountCents: amt });
  if (!r.ok) throw new Error(r.reason);
  const year = new Date().getFullYear();
  const count = await db.refund.count();
  const ref = await db.refund.create({ data: { paymentId: p.id, amountCents: amt, reason, reference: `RF-${year}-${String(count + 88).padStart(4, "0")}` } });
  const total = p.refundedCents + amt;
  await db.payment.update({ where: { id: p.id }, data: { refundedCents: total, status: total >= p.amountCents ? "REFUNDED" : "PARTIALLY_REFUNDED" } });
  const amount = money(amt, p.currency);
  await sendEmail(p.patient.email, { template: "refund", amount });
  await notify(p.patientId, { category: "BILLING", title: `${amount} refunded`, body: reason, href: `/portal/billing/refunds/${ref.id}` });
  return ref;
}
