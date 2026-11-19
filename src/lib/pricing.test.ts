import { describe, expect, it } from "vitest";
import { localizeQuote, priceVisit, prorate, usdToNgnKobo, type PricedPlan, type PricedVisitType } from "./pricing";

// The worked examples on board 01.6 Pricing Rules.
const intro: PricedVisitType = { id: "intro", name: "Intro call", durationMin: 15, priceCents: 0, alwaysFree: true };
const followUp: PricedVisitType = { id: "fu", name: "Follow-up", durationMin: 30, priceCents: 9500 };
const coaching: PricedVisitType = { id: "fc", name: "Family coaching", durationMin: 45, priceCents: 14000 };
const initial: PricedVisitType = { id: "ic", name: "Initial consultation", durationMin: 60, priceCents: 18000 };

const thrive: PricedPlan = { name: "Thrive", discountPct: 15, includedVisits: 1, includedVisitTypeIds: ["fu"], includedLabel: "1 follow-up" };
const connect: PricedPlan = { name: "Connect", discountPct: 15, includedVisits: 0, includedVisitTypeIds: [] };

describe("priceVisit", () => {
  it("Thrive member books their follow-up → $0, no payment step", () => {
    const r = priceVisit({ visitType: followUp, plan: thrive, allowanceUsed: 0 });
    expect(r).toMatchObject({ reason: "INCLUDED", amountCents: 0, needsPayment: false, usesAllowance: true });
  });

  it("Thrive member books a second follow-up in the month → $80.75 with a why note", () => {
    const r = priceVisit({ visitType: followUp, plan: thrive, allowanceUsed: 1 });
    expect(r).toMatchObject({ reason: "MEMBER_RATE", amountCents: 8075, needsPayment: true, usesAllowance: false });
    expect(r.why).toMatch(/already used/);
  });

  it("Thrive member books family coaching → $119.00 member rate", () => {
    const r = priceVisit({ visitType: coaching, plan: thrive, allowanceUsed: 0 });
    expect(r).toMatchObject({ reason: "MEMBER_RATE", amountCents: 11900, discountCents: 2100 });
    expect(r.why).toMatch(/not covered/);
  });

  it("No plan, follow-up → $95.00 standard", () => {
    expect(priceVisit({ visitType: followUp, plan: null, allowanceUsed: 0 })).toMatchObject({ reason: "STANDARD", amountCents: 9500 });
  });

  it("Anyone, intro call → free", () => {
    expect(priceVisit({ visitType: intro, plan: thrive, allowanceUsed: 0 })).toMatchObject({ reason: "FREE", amountCents: 0, needsPayment: false });
    expect(priceVisit({ visitType: intro, plan: null, allowanceUsed: 0 }).amountCents).toBe(0);
  });

  it("Initial consultation for a Connect member → $153 member rate", () => {
    expect(priceVisit({ visitType: initial, plan: connect, allowanceUsed: 0 }).amountCents).toBe(15300);
  });

  it("honours a configured member price over the plan discount", () => {
    expect(priceVisit({ visitType: { ...coaching, memberPriceCents: 11000 }, plan: thrive, allowanceUsed: 0 }).amountCents).toBe(11000);
  });
});

describe("prorate", () => {
  it("charges the price difference for the days left", () => {
    const start = new Date("2026-10-01T00:00:00Z");
    const end = new Date("2026-10-31T00:00:00Z");
    const now = new Date("2026-10-24T00:00:00Z");
    const r = prorate(12900, 22900, start, end, now);
    expect(r.daysLeft).toBe(7);
    expect(r.amountCents).toBe(Math.round((10000 * 7) / 30));
  });
});

describe("naira pricing for Nigeria accounts", () => {
  it("converts at the practice rate and rounds to the nearest ₦500 (amounts in kobo)", () => {
    expect(usdToNgnKobo(9500, 1500)).toBe(142_500_00);
    expect(usdToNgnKobo(8075, 1500)).toBe(121_000_00); // 121,125 → 121,000
  });
  it("re-expresses a member-rate quote in naira and keeps US quotes as they are", () => {
    const usd = priceVisit({ visitType: followUp, plan: thrive, allowanceUsed: 1 });
    const ng = localizeQuote(usd, "NGN", 1500);
    expect(ng.currency).toBe("NGN");
    expect(ng.amountCents).toBe(usdToNgnKobo(usd.amountCents, 1500));
    expect(ng.discountCents).toBe(ng.standardCents - ng.amountCents);
    expect(ng.pickerLine).toBe("₦121,000 member rate");
    expect(localizeQuote(usd, "USD", 1500)).toEqual({ ...usd, currency: "USD" });
  });
});
