import "server-only";
import { randomUUID } from "node:crypto";
import { Prisma, type Currency, type Payment, type PaymentKind } from "@prisma/client";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { money } from "@/lib/format";
import { notify, notifyDoctors } from "@/lib/notify";
import { charge, refund as providerRefund, type SavedCard } from "@/lib/payments";
import { fmt } from "@/lib/time";

/**
 * Yearly numbers like NO-2026-0417 / RF-2026-0091: one more than the highest issued so far.
 * Two payments at the same moment can pick the same number; the unique index rejects the second,
 * and `withNumber` retries it with the next one. A charge that already went through must always
 * get recorded, so this never gives up after a single clash.
 */
async function nextNumber(prefix: string, recent: (startsWith: string) => Promise<string[]>, start: number, bump = 0) {
  const head = `${prefix}-${new Date().getFullYear()}-`;
  const nums = (await recent(head)).map((s) => Number(s.slice(head.length))).filter(Number.isFinite);
  return `${head}${String(Math.max(start - 1, ...nums) + 1 + bump).padStart(4, "0")}`;
}

async function withNumber<T>(next: (bump: number) => Promise<string>, create: (no: string) => Promise<T>, field: string): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await create(await next(attempt));
    } catch (e) {
      const clash = e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002" && JSON.stringify(e.meta ?? {}).includes(field);
      if (!clash || attempt >= 9) throw e;
    }
  }
}

// The highest numbers by text order (exact while numbers stay 4 digits) and the newest by date
// (covers 5+ digit numbers, which sort lower as text).
const recentReceipts = async (startsWith: string) => {
  const q = (orderBy: Prisma.PaymentOrderByWithRelationInput) => db.payment.findMany({ where: { receiptNo: { startsWith } }, orderBy, take: 20, select: { receiptNo: true } });
  return [...(await q({ receiptNo: "desc" })), ...(await q({ createdAt: "desc" }))].map((p) => p.receiptNo);
};
const recentRefunds = async (startsWith: string) => {
  const q = (orderBy: Prisma.RefundOrderByWithRelationInput) => db.refund.findMany({ where: { reference: { startsWith } }, orderBy, take: 20, select: { reference: true } });
  return [...(await q({ reference: "desc" })), ...(await q({ createdAt: "desc" }))].map((r) => r.reference);
};

/** Record a payment with the next free receipt number. */
export function createPayment(data: Omit<Prisma.PaymentUncheckedCreateInput, "receiptNo">) {
  return withNumber((bump) => nextNumber("NO", recentReceipts, 401, bump), (receiptNo) => db.payment.create({ data: { ...data, receiptNo } }), "receiptNo");
}

/** Save a provider card token for a patient, reusing the row if the same card was saved before. */
export async function saveCard(userId: string, card: SavedCard) {
  const existing = card.fingerprint ? await db.paymentMethod.findFirst({ where: { userId, provider: card.provider, fingerprint: card.fingerprint } }) : null;
  if (existing) {
    return db.paymentMethod.update({
      where: { id: existing.id },
      data: { providerRef: card.providerRef, providerCustomer: card.providerCustomer, expMonth: card.expMonth, expYear: card.expYear, brand: card.brand, last4: card.last4 },
    });
  }
  const count = await db.paymentMethod.count({ where: { userId } });
  return db.paymentMethod.create({ data: { userId, ...card, isDefault: count === 0 } });
}

/** Receipt email + in-app notices for a payment that went through. */
export async function announcePaid(payment: Payment) {
  const patient = await db.user.findUniqueOrThrow({ where: { id: payment.patientId } });
  const amount = money(payment.amountCents, payment.currency);
  await sendEmail(patient.email, {
    template: "receipt",
    amount,
    description: payment.description,
    receiptNo: payment.receiptNo,
    method: payment.note ?? "Card",
    date: fmt(payment.createdAt, patient.timeZone, "d MMM yyyy"),
    id: payment.id,
  });
  await notify(patient.id, { category: "BILLING", title: "Payment received", body: `${payment.description} · ${amount}`, href: `/portal/billing/${payment.id}` });
  await notifyDoctors({ category: "PAYMENTS", title: "Payment received", body: `${patient.name} · ${payment.description}`, amount, href: "/doctor/earnings" });
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
  /** Same key → at most one charge at the processor (use a stable key for renewals). */
  idempotencyKey?: string;
}) {
  const pm = await db.paymentMethod.findFirstOrThrow({ where: { id: opts.paymentMethodId, userId: opts.patientId } });
  const r = await charge({
    method: pm,
    amountCents: opts.amountCents,
    currency: opts.currency,
    description: opts.description,
    idempotencyKey: opts.idempotencyKey ?? `pay_${randomUUID()}`,
  });
  const payment = await createPayment({
    patientId: opts.patientId,
    kind: opts.kind,
    status: r.ok ? "PAID" : "FAILED",
    amountCents: opts.amountCents,
    currency: opts.currency,
    description: opts.description,
    note: opts.note ?? `${pm.brand} ending ${pm.last4}`,
    paymentMethodId: pm.id,
    provider: pm.provider,
    providerRef: r.ok ? r.ref : null,
    failureReason: r.ok ? null : r.reason,
    appointmentId: opts.appointmentId,
    membershipId: opts.membershipId,
  });
  if (r.ok) await announcePaid(payment);
  return { ok: r.ok, payment, reason: r.ok ? null : r.reason };
}

/** Refund all or part of a payment, record it, and tell the patient (06.8 / 10.9). */
export async function refundPayment(paymentId: string, amountCents: number, reason: string) {
  const p = await db.payment.findUniqueOrThrow({ where: { id: paymentId }, include: { patient: true } });
  const refundable = p.amountCents - p.refundedCents;
  if (p.status !== "PAID" && p.status !== "PARTIALLY_REFUNDED") throw new Error("Only paid payments can be refunded.");
  const amt = Math.min(Math.max(1, amountCents), refundable);
  const r = await providerRefund({ provider: p.provider, chargeRef: p.providerRef, amountCents: amt, idempotencyKey: `refund_${p.id}_${p.refundedCents}_${amt}` });
  if (!r.ok) throw new Error(r.reason);
  const ref = await withNumber(
    (bump) => nextNumber("RF", recentRefunds, 88, bump),
    (reference) => db.refund.create({ data: { paymentId: p.id, amountCents: amt, reason, reference } }),
    "reference",
  );
  const total = p.refundedCents + amt;
  await db.payment.update({ where: { id: p.id }, data: { refundedCents: total, status: total >= p.amountCents ? "REFUNDED" : "PARTIALLY_REFUNDED" } });
  const amount = money(amt, p.currency);
  await sendEmail(p.patient.email, { template: "refund", amount, description: p.description, reference: ref.reference, method: p.note ?? "Card", id: ref.id });
  await notify(p.patientId, { category: "BILLING", title: `${amount} refunded`, body: reason, href: `/portal/billing/refunds/${ref.id}` });
  return ref;
}
