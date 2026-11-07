import "server-only";

/**
 * Payment adapter. PAYMENTS_PROVIDER=mock (default) simulates a processor:
 *   - card ending 0002 is declined (board 06.7), every other valid card succeeds.
 * Live mode is the integration point for Stripe (USD) and Paystack (NGN): card entry moves
 * to the provider's hosted fields and these functions call their APIs with the stored providerRef.
 */
export interface CardInput {
  number: string;
  expMonth: number;
  expYear: number;
  cvc: string;
  name: string;
}

export interface Tokenized {
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  country: string;
  provider: string;
  providerRef: string;
}

export type ChargeResult = { ok: true; ref: string } | { ok: false; reason: string };

const live = () => process.env.PAYMENTS_PROVIDER === "live";

export function brandOf(num: string) {
  const n = num.replace(/\D/g, "");
  if (/^(5060|5061|5078|5079|6500)/.test(n)) return "Verve";
  if (/^4/.test(n)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(n)) return "Mastercard";
  if (/^3[47]/.test(n)) return "Amex";
  return "Card";
}

export function luhn(num: string) {
  const d = num.replace(/\D/g, "");
  if (d.length < 12 || d.length > 19) return false;
  let sum = 0;
  for (let i = 0; i < d.length; i++) {
    let x = Number(d[d.length - 1 - i]);
    if (i % 2) {
      x *= 2;
      if (x > 9) x -= 9;
    }
    sum += x;
  }
  return sum % 10 === 0;
}

export async function tokenizeCard(card: CardInput): Promise<Tokenized> {
  if (live()) throw new Error("Live card entry uses the provider's hosted fields; raw card numbers never reach this server.");
  const digits = card.number.replace(/\D/g, "");
  const brand = brandOf(digits);
  return {
    brand,
    last4: digits.slice(-4),
    expMonth: card.expMonth,
    expYear: card.expYear,
    country: brand === "Verve" ? "NG" : "US",
    provider: "mock",
    providerRef: `pm_mock_${digits.slice(-4)}_${Date.now().toString(36)}`,
  };
}

export async function charge(opts: { amountCents: number; currency: "USD" | "NGN"; providerRef: string; description: string }): Promise<ChargeResult> {
  if (live()) throw new Error("Configure STRIPE_SECRET_KEY / PAYSTACK_SECRET_KEY and implement the live charge call.");
  if (opts.providerRef.includes("_0002_")) return { ok: false, reason: "This card was declined. Try another card." };
  return { ok: true, ref: `ch_mock_${Date.now().toString(36)}` };
}

export async function refund(opts: { chargeRef: string; amountCents: number }): Promise<ChargeResult> {
  if (live()) throw new Error("Implement the live refund call for the configured provider.");
  return { ok: true, ref: `re_mock_${Date.now().toString(36)}_${opts.amountCents}` };
}
