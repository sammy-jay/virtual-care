import "server-only";
import { cache } from "react";
import type { Membership, Plan, VisitType } from "@prisma/client";
import { db } from "@/lib/db";
import { moneyShort } from "@/lib/format";
import { localizeQuote, planPriceCents, priceVisit, usdToNgnKobo, type PricingResult } from "@/lib/pricing";
import { addMonths } from "@/lib/time";

export const getPractice = cache(async () => {
  const p = await db.practice.findFirst();
  if (!p) throw new Error("Practice is not configured. Run `npm run db:seed`.");
  return p;
});

export const getVisitTypes = cache(() => db.visitType.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }));
export const getPlans = cache(() => db.plan.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }));

export type MembershipWithPlan = Membership & { plan: Plan };

/** The membership that is in force now (ACTIVE or in grace), if any. */
export const getActiveMembership = cache(async (patientId: string): Promise<MembershipWithPlan | null> => {
  return db.membership.findFirst({
    where: { patientId, status: { in: ["ACTIVE", "PAST_DUE"] } },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });
});

/** Billing period that contains `at`, rolling the current period forward month by month. */
export function periodContaining(m: Membership, at: Date) {
  let start = m.currentPeriodStart;
  let end = m.currentPeriodEnd;
  let guard = 0;
  while (at >= end && guard++ < 24) {
    start = end;
    end = addMonths(end, 1);
  }
  return { start, end };
}

/** Whether the membership still covers a visit at `at` (it ends at period end once cancelled). */
export function coversDate(m: Membership, at: Date) {
  if (m.status === "CANCELED") return false;
  if (m.cancelAtPeriodEnd && at >= m.currentPeriodEnd) return false;
  return true;
}

export async function allowanceUsed(m: Membership, at: Date, excludeAppointmentId?: string) {
  const { start, end } = periodContaining(m, at);
  return db.appointment.count({
    where: {
      membershipId: m.id,
      usesAllowance: true,
      status: { in: ["SCHEDULED", "COMPLETED", "NO_SHOW", "PENDING_PAYMENT"] },
      startsAt: { gte: start, lt: end },
      ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
    },
  });
}

export interface Quote extends PricingResult {
  membership: MembershipWithPlan | null;
  /** USD for US accounts (Stripe); NGN for Nigeria accounts (Paystack). Amounts are in that currency's minor unit. */
  currency: "USD" | "NGN";
}

/** The currency an account pays in: Nigeria accounts pay naira, everyone else dollars. */
export async function accountCurrency(patientId: string): Promise<"USD" | "NGN"> {
  const u = await db.user.findUnique({ where: { id: patientId }, select: { market: true } });
  return u?.market === "NG" ? "NGN" : "USD";
}

/** Prices formatted the way this patient pays: naira for Nigeria accounts (visit prices converted at the practice rate). */
export async function pricesFor(patientId: string) {
  const [currency, practice] = await Promise.all([accountCurrency(patientId), getPractice()]);
  return {
    currency,
    plan: (p: Pick<Plan, "monthlyPriceCents" | "monthlyPriceNgn">) => moneyShort(planPriceCents(p, currency), currency),
    visit: (usdCents: number) => moneyShort(currency === "NGN" ? usdToNgnKobo(usdCents, practice.ngnPerUsd) : usdCents, currency),
  };
}

/** Price a visit for a patient at a given time — the only entry point booking screens use. */
export async function quoteVisit(patientId: string, visitType: VisitType, at: Date = new Date()): Promise<Quote> {
  const m = await getActiveMembership(patientId);
  const covering = m && coversDate(m, at) ? m : null;
  const used = covering ? await allowanceUsed(covering, at) : 0;
  const r = priceVisit({
    visitType,
    plan: covering
      ? {
          name: covering.plan.name,
          discountPct: covering.plan.discountPct,
          includedVisits: covering.plan.includedVisits,
          includedVisitTypeIds: covering.plan.includedVisitTypeIds,
          includedLabel: covering.plan.includedLabel,
        }
      : null,
    allowanceUsed: used,
  });
  const [currency, practice] = await Promise.all([accountCurrency(patientId), getPractice()]);
  return { ...localizeQuote(r, currency, practice.ngnPerUsd), membership: covering };
}

/** Has the patient completed (or got scheduled) a non-intro visit? Follow-ups need one. */
export async function hasPriorVisit(patientId: string) {
  const n = await db.appointment.count({ where: { patientId, status: { in: ["COMPLETED", "SCHEDULED"] }, visitType: { alwaysFree: false } } });
  return n > 0;
}

/** Messaging rule (board 05.4): members all month; pay-per-visit for 14 days after a visit. */
export async function messagingAccess(patientId: string) {
  const practice = await getPractice();
  const m = await getActiveMembership(patientId);
  if (m) return { open: true as const, reason: "member" as const, plan: m.plan.name };
  const last = await db.appointment.findFirst({
    where: { patientId, status: "COMPLETED" },
    orderBy: { startsAt: "desc" },
  });
  if (last) {
    const until = new Date(last.endsAt.getTime() + practice.messagingWindowDays * 86400_000);
    if (until > new Date()) return { open: true as const, reason: "window" as const, until };
  }
  return { open: false as const, reason: "locked" as const };
}

export async function unreadForPatient(patientId: string) {
  return db.message.count({ where: { conversation: { patientId }, fromDoctor: true, readAt: null } });
}

export async function unreadForDoctor() {
  return db.message.count({ where: { fromDoctor: false, readAt: null } });
}
