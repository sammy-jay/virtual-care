import { describe, expect, it } from "vitest";
import { moneyTotals, sumByCurrency, toUsdCents } from "./format";

const pay = (amountCents: number, currency: string, refundedCents = 0) => ({ amountCents, currency, refundedCents });

describe("mixed-currency totals", () => {
  it("never adds naira (kobo) to dollars (cents)", () => {
    const t = sumByCurrency([pay(14_900, "USD"), pay(20_000_000, "NGN"), pay(9_500, "USD", 9_500)], (p) => p.amountCents - p.refundedCents, (p) => p.currency);
    expect(t).toEqual({ USD: 14_900, NGN: 20_000_000 });
    expect(moneyTotals(t)).toBe("$149.00 + ₦200,000");
  });

  it("shows only the currency a patient paid in", () => {
    expect(moneyTotals({ USD: 0, NGN: 20_000_000 })).toBe("₦200,000");
    expect(moneyTotals({ USD: 27_500, NGN: 0 }, { short: true })).toBe("$275");
  });

  it("shows a zero total in the patient's own currency", () => {
    expect(moneyTotals({ USD: 0, NGN: 0 }, { empty: "NGN" })).toBe("₦0");
    expect(moneyTotals({ USD: 0, NGN: 0 })).toBe("$0.00");
  });

  it("converts naira to dollars for practice-wide reports at the practice rate", () => {
    expect(toUsdCents(20_000_000, "NGN", 1500)).toBe(13_333); // ₦200,000 ≈ $133.33
    expect(toUsdCents(14_900, "USD", 1500)).toBe(14_900);
  });
});
