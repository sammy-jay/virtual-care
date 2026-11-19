import "server-only";

/**
 * Payment adapter.
 *
 * PAYMENTS_PROVIDER=mock (default): simulated processor for development and tests. Card ending 0002
 *   is declined (board 06.7), every other valid card succeeds.
 * PAYMENTS_PROVIDER=live: the real Stripe and Paystack gateways.
 * PAYMENTS_PROVIDER=test: the same gateways, but only test keys (sk_test_…) are accepted, so no real money moves.
 *   - Nigeria accounts pay in NGN through Paystack.
 *   - Every other account pays in USD through Stripe.
 *   New cards are entered only on the provider's hosted checkout page (src/lib/checkout.ts), so card
 *   numbers never reach this server. Saved cards are reusable tokens charged server-side.
 */
export type Provider = "mock" | "stripe" | "paystack";
export type ChargeResult = { ok: true; ref: string } | { ok: false; reason: string };

/** A reusable card token plus the display details we keep. Never a card number. */
export interface SavedCard {
  provider: Provider;
  providerRef: string;
  providerCustomer: string | null;
  fingerprint: string | null;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  country: string;
}

/** True when payments go through the real gateways (with live or test keys). */
export const paymentsLive = () => process.env.PAYMENTS_PROVIDER === "live" || process.env.PAYMENTS_PROVIDER === "test";

/** A gateway secret key from the environment. In test mode a live key is refused, so a mix-up cannot charge real cards. */
export function secretKey(name: "STRIPE_SECRET_KEY" | "PAYSTACK_SECRET_KEY") {
  const key = process.env[name];
  if (!key) throw new Error(`${name} is not set.`);
  if (process.env.PAYMENTS_PROVIDER === "test" && !/^(sk|rk)_test_/.test(key)) {
    throw new Error(`PAYMENTS_PROVIDER=test needs a test key in ${name} (sk_test_…).`);
  }
  return key;
}

/** Which processor handles a currency: Paystack for naira, Stripe for dollars (mock in development). */
export function providerFor(currency: "USD" | "NGN"): Provider {
  if (!paymentsLive()) return "mock";
  return currency === "NGN" ? "paystack" : "stripe";
}

export const providerLabel = (p: Provider) => (p === "stripe" ? "Stripe" : p === "paystack" ? "Paystack" : "Test processor");

// ─── Mock processor ──────────────────────────────────────────────────────────

export interface CardInput {
  number: string;
  expMonth: number;
  expYear: number;
  cvc: string;
  name: string;
}

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

/** Mock only. In live mode raw card numbers are never accepted. */
export async function tokenizeCard(card: CardInput): Promise<SavedCard> {
  if (paymentsLive()) throw new Error("Live payments take new cards on the provider's hosted checkout page only.");
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
    providerCustomer: null,
    fingerprint: null,
  };
}

// ─── Dispatch ────────────────────────────────────────────────────────────────

/** Charge a saved card. `idempotencyKey` makes retries safe (same key → at most one charge). */
export async function charge(o: {
  method: { provider: string; providerRef: string | null; providerCustomer: string | null };
  amountCents: number;
  currency: "USD" | "NGN";
  description: string;
  idempotencyKey: string;
}): Promise<ChargeResult> {
  const { method } = o;
  if (method.provider === "mock") {
    if (paymentsLive()) return { ok: false, reason: "This card needs to be added again. Pay with a new card." };
    if (method.providerRef?.includes("_0002_")) return { ok: false, reason: "This card was declined. Try another card." };
    return { ok: true, ref: `ch_mock_${Date.now().toString(36)}` };
  }
  if (!method.providerRef || !method.providerCustomer) return { ok: false, reason: "This card needs to be added again. Pay with a new card." };
  if (method.provider === "stripe") {
    if (o.currency !== "USD") return { ok: false, reason: "This card can only pay in US dollars." };
    const { chargeSaved } = await import("./stripe");
    return chargeSaved({ customer: method.providerCustomer, paymentMethod: method.providerRef, amountCents: o.amountCents, description: o.description, idempotencyKey: o.idempotencyKey });
  }
  if (method.provider === "paystack") {
    if (o.currency !== "NGN") return { ok: false, reason: "This card can only pay in naira." };
    const { chargeAuthorization } = await import("./paystack");
    return chargeAuthorization({ authorizationCode: method.providerRef, email: method.providerCustomer, amountKobo: o.amountCents, reference: o.idempotencyKey });
  }
  return { ok: false, reason: "Unknown payment provider." };
}

export async function refund(o: { provider: string; chargeRef: string | null; amountCents: number; idempotencyKey: string }): Promise<ChargeResult> {
  if (o.provider === "mock") return { ok: true, ref: `re_mock_${Date.now().toString(36)}_${o.amountCents}` };
  if (!o.chargeRef) return { ok: false, reason: "This payment has no processor reference to refund." };
  if (o.provider === "stripe") {
    const { refundStripe } = await import("./stripe");
    return refundStripe({ paymentIntent: o.chargeRef, amountCents: o.amountCents, idempotencyKey: o.idempotencyKey });
  }
  if (o.provider === "paystack") {
    const { refundPaystack } = await import("./paystack");
    return refundPaystack({ reference: o.chargeRef, amountKobo: o.amountCents });
  }
  return { ok: false, reason: "Unknown payment provider." };
}
