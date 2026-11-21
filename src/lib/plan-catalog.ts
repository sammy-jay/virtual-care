/**
 * The membership on sale. For now there is a single plan with one price per market:
 * $149/month (US and every other non-Nigeria account, via Stripe) and ₦200,000/month (Nigeria, via Paystack).
 *
 * prisma/seed.ts creates it, and `npm run plans:apply` writes it to an existing database (other plans are
 * hidden from sale, not deleted). Prices can also be changed later in doctor Settings.
 */
export const MEMBERSHIP_PLAN = {
  slug: "thrive",
  name: "Thrive",
  tagline: "Ongoing care with a monthly visit.",
  monthlyPriceCents: 14_900,
  monthlyPriceNgn: 200_000,
  discountPct: 15,
  includedVisits: 1,
  /** Visit types included each month, by slug (resolved to ids when written). */
  includedVisitTypeSlugs: ["follow-up"],
  includedLabel: "1 follow-up",
  maxFamilyMembers: 1,
  popular: true,
  sortOrder: 0,
  features: [
    "Secure messaging with Dr. Oparaji",
    "Replies within 1 business day",
    "1 follow-up visit included each month",
    "Priority scheduling",
    "15% off every other visit",
    "Care plans and receipts in one place",
  ],
} as const;

/** The plan row to write, given the ids of the included visit types. */
export function membershipPlanData(includedVisitTypeIds: string[]) {
  const { includedVisitTypeSlugs: _slugs, features, ...rest } = MEMBERSHIP_PLAN;
  void _slugs;
  return { ...rest, features: [...features], includedVisitTypeIds, active: true };
}
