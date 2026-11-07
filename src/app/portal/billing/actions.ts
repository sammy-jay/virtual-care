"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePatient } from "@/lib/auth/dal";
import { chargeAndRecord } from "@/lib/billing";
import { resolvePaymentMethod } from "@/lib/cards";
import { getActiveMembership } from "@/lib/care";
import { db } from "@/lib/db";
import { prorate } from "@/lib/pricing";
import { addMonths } from "@/lib/time";
import { confirmBooked } from "@/lib/visits";

export type PayState = { error?: string };

/** 06.5 — pay for a PENDING_PAYMENT visit. */
export async function payForVisit(_: PayState, form: FormData): Promise<PayState> {
  const user = await requirePatient();
  const a = await db.appointment.findUnique({ where: { id: String(form.get("appointmentId")) }, include: { visitType: true } });
  if (!a || a.patientId !== user.id) redirect("/portal/visits");
  if (a.status !== "PENDING_PAYMENT") redirect(`/portal/visits/${a.id}/confirmed`);
  const pm = await resolvePaymentMethod(user.id, form);
  if ("error" in pm) return { error: pm.error };
  const r = await chargeAndRecord({
    patientId: user.id,
    paymentMethodId: pm.id,
    amountCents: a.priceCents,
    currency: a.currency,
    kind: "VISIT",
    description: a.visitType.name,
    note: a.pricingReason === "MEMBER_RATE" ? "Member rate" : "Pay per visit",
    appointmentId: a.id,
  });
  if (!r.ok) redirect(`/portal/billing/failed?payment=${r.payment.id}&retry=/portal/visits/${a.id}/pay`);
  await db.appointment.update({ where: { id: a.id }, data: { status: "SCHEDULED", paymentId: r.payment.id } });
  await confirmBooked(a.id);
  redirect(`/portal/visits/${a.id}/confirmed`);
}

/** 06.3 / 06.4 — join a plan. Nigerian (Verve / NG) cards pay the fixed naira price. */
export async function joinPlan(_: PayState, form: FormData): Promise<PayState> {
  const user = await requirePatient();
  const plan = await db.plan.findUnique({ where: { slug: String(form.get("plan")) } });
  if (!plan) redirect("/membership");
  if (await getActiveMembership(user.id)) redirect("/portal/membership");
  const pm = await resolvePaymentMethod(user.id, form);
  if ("error" in pm) return { error: pm.error };
  const method = await db.paymentMethod.findUniqueOrThrow({ where: { id: pm.id } });
  const ngn = form.get("currency") === "NGN" || method.country === "NG";
  const start = new Date();
  const membership = await db.membership.create({
    data: { patientId: user.id, planId: plan.id, currency: ngn ? "NGN" : "USD", currentPeriodStart: start, currentPeriodEnd: addMonths(start, 1), paymentMethodId: pm.id },
  });
  const r = await chargeAndRecord({
    patientId: user.id,
    paymentMethodId: pm.id,
    amountCents: ngn ? plan.monthlyPriceNgn * 100 : plan.monthlyPriceCents,
    currency: ngn ? "NGN" : "USD",
    kind: "MEMBERSHIP",
    description: `${plan.name} monthly`,
    membershipId: membership.id,
  });
  if (!r.ok) {
    await db.membership.delete({ where: { id: membership.id } });
    redirect(`/portal/billing/failed?payment=${r.payment.id}&retry=/portal/checkout?plan=${plan.slug}`);
  }
  // Any visits already booked at full price stay as they are; new bookings use the plan.
  revalidatePath("/portal", "layout");
  redirect("/portal/membership?joined=1");
}

/** 06.9 — switch plans with a prorated charge today. */
export async function switchPlan(form: FormData) {
  const user = await requirePatient();
  const m = await getActiveMembership(user.id);
  const to = await db.plan.findUnique({ where: { slug: String(form.get("plan")) } });
  if (!m || !to || to.id === m.planId) redirect("/portal/membership");
  const ngn = m.currency === "NGN";
  const fromPrice = ngn ? m.plan.monthlyPriceNgn * 100 : m.plan.monthlyPriceCents;
  const toPrice = ngn ? to.monthlyPriceNgn * 100 : to.monthlyPriceCents;
  const { amountCents } = prorate(fromPrice, toPrice, m.currentPeriodStart, m.currentPeriodEnd);
  if (amountCents > 0) {
    if (!m.paymentMethodId) redirect("/portal/settings/payment-methods");
    const r = await chargeAndRecord({ patientId: user.id, paymentMethodId: m.paymentMethodId, amountCents, currency: m.currency, kind: "PRORATION", description: `Switch to ${to.name} (prorated)`, membershipId: m.id });
    if (!r.ok) redirect(`/portal/billing/failed?payment=${r.payment.id}&retry=/portal/membership`);
  }
  await db.membership.update({ where: { id: m.id }, data: { planId: to.id, cancelAtPeriodEnd: false } });
  revalidatePath("/portal", "layout");
  redirect("/portal/membership?switched=1");
}

/** 06.10 — cancel at period end; access continues until then. */
export async function cancelMembership() {
  const user = await requirePatient();
  const m = await getActiveMembership(user.id);
  if (m) await db.membership.update({ where: { id: m.id }, data: { cancelAtPeriodEnd: true, canceledAt: new Date() } });
  revalidatePath("/portal", "layout");
  redirect("/portal/membership?cancelled=1");
}

export async function resumeMembership() {
  const user = await requirePatient();
  const m = await getActiveMembership(user.id);
  if (m) await db.membership.update({ where: { id: m.id }, data: { cancelAtPeriodEnd: false, canceledAt: null } });
  revalidatePath("/portal", "layout");
  redirect("/portal/membership");
}

// ─── Payment methods (06.11) ─────────────────────────────────────────────────

export async function addCard(_: PayState, form: FormData): Promise<PayState> {
  const user = await requirePatient();
  form.set("paymentMethodId", "new");
  const r = await resolvePaymentMethod(user.id, form);
  if ("error" in r) return { error: r.error };
  redirect("/portal/settings/payment-methods");
}

export async function removeCard(form: FormData) {
  const user = await requirePatient();
  const id = String(form.get("id"));
  const inUse = await db.membership.findFirst({ where: { patientId: user.id, paymentMethodId: id, status: { in: ["ACTIVE", "PAST_DUE"] } } });
  if (inUse) redirect("/portal/settings/payment-methods?error=inuse");
  await db.payment.updateMany({ where: { paymentMethodId: id, patientId: user.id }, data: { paymentMethodId: null } });
  await db.paymentMethod.deleteMany({ where: { id, userId: user.id } });
  redirect("/portal/settings/payment-methods");
}

export async function makeDefaultCard(form: FormData) {
  const user = await requirePatient();
  const id = String(form.get("id"));
  await db.paymentMethod.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
  await db.paymentMethod.updateMany({ where: { id, userId: user.id }, data: { isDefault: true } });
  const m = await getActiveMembership(user.id);
  if (m) await db.membership.update({ where: { id: m.id }, data: { paymentMethodId: id, status: m.status === "PAST_DUE" ? "ACTIVE" : m.status } });
  redirect("/portal/settings/payment-methods");
}
