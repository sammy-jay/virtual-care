/**
 * The single rule set behind every booking and payment screen (board 01.6).
 *
 * 1. Intro call is always free, no card.
 * 2. A visit included in the plan with allowance left is never charged; no payment step.
 * 3. Members pay the member rate for visits beyond the allowance or types not included.
 * 4. Everyone else pays the standard price.
 * 5. Every result carries the "why" shown on payment screens.
 */

export type PricingReason = "FREE" | "INCLUDED" | "MEMBER_RATE" | "STANDARD";

export interface PricedVisitType {
  id: string;
  name: string;
  durationMin: number;
  priceCents: number;
  memberPriceCents?: number | null;
  alwaysFree?: boolean;
}

export interface PricedPlan {
  name: string;
  discountPct: number;
  includedVisits: number;
  includedVisitTypeIds: string[];
  includedLabel?: string | null;
}

export interface PricingInput {
  visitType: PricedVisitType;
  /** Active membership that covers the visit date, or null. */
  plan: PricedPlan | null;
  /** Included visits already reserved in the billing period the visit falls in. */
  allowanceUsed: number;
}

export interface PricingResult {
  reason: PricingReason;
  amountCents: number;
  standardCents: number;
  discountCents: number;
  usesAllowance: boolean;
  needsPayment: boolean;
  /** Short line for the visit picker: "Included · 1 of 1 this month", "$119.00 member rate". */
  pickerLine: string;
  /** Tag next to the visit name: "Always free", "Thrive", "15% off". */
  tag: string | null;
  /** Plan row in the summary, e.g. "Thrive · 1 included visit". */
  planLine: string;
  /** "Why am I paying?" explanation, null when nothing is charged. */
  why: string | null;
}

export function memberRateCents(vt: PricedVisitType, plan: PricedPlan) {
  if (vt.memberPriceCents != null) return vt.memberPriceCents;
  return Math.round((vt.priceCents * (100 - plan.discountPct)) / 100);
}

const usd = (c: number) => `$${(c / 100).toFixed(2)}`;

export function priceVisit({ visitType: vt, plan, allowanceUsed }: PricingInput): PricingResult {
  const standardCents = vt.priceCents;

  if (vt.alwaysFree || vt.priceCents === 0) {
    return {
      reason: "FREE",
      amountCents: 0,
      standardCents: 0,
      discountCents: 0,
      usesAllowance: false,
      needsPayment: false,
      pickerLine: "Free · no card needed",
      tag: "Always free",
      planLine: plan ? plan.name : "Pay per visit",
      why: null,
    };
  }

  if (plan) {
    const covered = plan.includedVisitTypeIds.includes(vt.id);
    const left = plan.includedVisits - allowanceUsed;
    if (covered && left > 0) {
      return {
        reason: "INCLUDED",
        amountCents: 0,
        standardCents,
        discountCents: standardCents,
        usesAllowance: true,
        needsPayment: false,
        pickerLine: `Included · ${allowanceUsed + 1} of ${plan.includedVisits} this month`,
        tag: plan.name,
        planLine: `${plan.name} · ${plan.includedVisits} included visit${plan.includedVisits === 1 ? "" : "s"}`,
        why: null,
      };
    }
    const amountCents = memberRateCents(vt, plan);
    const included = plan.includedLabel ?? `${plan.includedVisits} visit${plan.includedVisits === 1 ? "" : "s"}`;
    const why = covered
      ? `${plan.name} includes ${included} each month and it is already used, so you get ${plan.discountPct}% off the standard price.`
      : plan.includedVisits > 0
        ? `${plan.name} includes ${included} each month. ${vt.name} is not covered, so you get ${plan.discountPct}% off the standard price.`
        : `${plan.name} does not include visits, so you get ${plan.discountPct}% off the standard price.`;
    return {
      reason: "MEMBER_RATE",
      amountCents,
      standardCents,
      discountCents: standardCents - amountCents,
      usesAllowance: false,
      needsPayment: amountCents > 0,
      pickerLine: `${usd(amountCents)} member rate`,
      tag: `${plan.discountPct}% off`,
      planLine: `${plan.name} member rate`,
      why,
    };
  }

  return {
    reason: "STANDARD",
    amountCents: standardCents,
    standardCents,
    discountCents: 0,
    usesAllowance: false,
    needsPayment: true,
    pickerLine: usd(standardCents),
    tag: null,
    planLine: "Pay per visit",
    why: null,
  };
}

/** Prorated charge when switching to a pricier plan mid-period (board 06.9). */
export function prorate(fromCents: number, toCents: number, periodStart: Date, periodEnd: Date, now = new Date()) {
  const total = periodEnd.getTime() - periodStart.getTime();
  const left = Math.max(0, periodEnd.getTime() - now.getTime());
  const daysLeft = Math.ceil(left / 86400000);
  const amount = Math.max(0, Math.round(((toCents - fromCents) * left) / total));
  return { amountCents: amount, daysLeft };
}
