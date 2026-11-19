import "server-only";
import Stripe from "stripe";
import { secretKey, type SavedCard, type ChargeResult } from "./index";

/**
 * Stripe: US site, and every account that is not a Nigeria account. Charges in USD.
 * Only the secret key is used (server-side). Card details are entered on Stripe Checkout,
 * never on this site, so card data never reaches our servers.
 */
let client: Stripe | null = null;
export function stripe() {
  if (!client) {
    const key = secretKey("STRIPE_SECRET_KEY");
    client = new Stripe(key, { maxNetworkRetries: 2, timeout: 20_000, appInfo: { name: "nneoma-virtual-care" } });
  }
  return client;
}

/** One Stripe customer per patient, created on first payment. */
export async function ensureCustomer(user: { id: string; email: string; name: string; stripeCustomerId: string | null }, save: (id: string) => Promise<unknown>) {
  if (user.stripeCustomerId) return user.stripeCustomerId;
  const c = await stripe().customers.create({ email: user.email, name: user.name, metadata: { userId: user.id } }, { idempotencyKey: `customer_${user.id}` });
  await save(c.id);
  return c.id;
}

export function cardFromPaymentMethod(pm: Stripe.PaymentMethod | string | null | undefined, customer: string): SavedCard | null {
  if (!pm || typeof pm === "string" || !pm.card) return null;
  const brand = pm.card.brand === "amex" ? "Amex" : pm.card.brand.charAt(0).toUpperCase() + pm.card.brand.slice(1);
  return {
    provider: "stripe",
    providerRef: pm.id,
    providerCustomer: customer,
    fingerprint: pm.card.fingerprint ?? null,
    brand,
    last4: pm.card.last4,
    expMonth: pm.card.exp_month,
    expYear: pm.card.exp_year,
    country: pm.card.country ?? "US",
  };
}

/** Hosted payment page. The card is saved for later charges (membership renewals). */
export async function createPaymentCheckout(o: {
  checkoutId: string;
  customer: string;
  amountCents: number;
  label: string;
  saveCard: boolean;
  successUrl: string;
  cancelUrl: string;
}) {
  return stripe().checkout.sessions.create(
    {
      mode: "payment",
      customer: o.customer,
      client_reference_id: o.checkoutId,
      allowed_payment_method_types: ["card"],
      line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: o.amountCents, product_data: { name: o.label } } }],
      payment_intent_data: {
        description: o.label,
        metadata: { checkoutId: o.checkoutId },
        ...(o.saveCard ? { setup_future_usage: "off_session" as const } : {}),
      },
      metadata: { checkoutId: o.checkoutId },
      success_url: o.successUrl,
      cancel_url: o.cancelUrl,
      // Matches the 30-minute slot hold (Stripe's minimum is 30 minutes).
      expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
    },
    { idempotencyKey: `checkout_${o.checkoutId}` },
  );
}

/** Hosted page that only saves a card (no charge). */
export async function createSetupCheckout(o: { checkoutId: string; customer: string; successUrl: string; cancelUrl: string }) {
  return stripe().checkout.sessions.create(
    {
      mode: "setup",
      customer: o.customer,
      currency: "usd",
      client_reference_id: o.checkoutId,
      allowed_payment_method_types: ["card"],
      metadata: { checkoutId: o.checkoutId },
      success_url: o.successUrl,
      cancel_url: o.cancelUrl,
    },
    { idempotencyKey: `setup_${o.checkoutId}` },
  );
}

export function retrieveSession(id: string) {
  return stripe().checkout.sessions.retrieve(id, { expand: ["payment_intent.payment_method", "setup_intent.payment_method"] });
}

/** Charge a saved card with no customer present (renewals, prorations, "pay with saved card"). */
export async function chargeSaved(o: { customer: string; paymentMethod: string; amountCents: number; description: string; idempotencyKey: string }): Promise<ChargeResult> {
  try {
    const pi = await stripe().paymentIntents.create(
      { amount: o.amountCents, currency: "usd", customer: o.customer, payment_method: o.paymentMethod, off_session: true, confirm: true, description: o.description },
      { idempotencyKey: o.idempotencyKey },
    );
    if (pi.status === "succeeded") return { ok: true, ref: pi.id };
    return { ok: false, reason: "Your bank needs you to confirm this payment. Pay with a new card to continue." };
  } catch (e) {
    if (e instanceof Stripe.errors.StripeCardError) {
      if (e.code === "authentication_required") return { ok: false, reason: "Your bank needs you to confirm this payment. Pay with a new card to continue." };
      return { ok: false, reason: e.message || "This card was declined. Try another card." };
    }
    console.error("[stripe] charge failed", e);
    return { ok: false, reason: "We could not reach the card processor. Please try again in a minute." };
  }
}

export async function refundStripe(o: { paymentIntent: string; amountCents: number; idempotencyKey: string }): Promise<ChargeResult> {
  try {
    const r = await stripe().refunds.create({ payment_intent: o.paymentIntent, amount: o.amountCents }, { idempotencyKey: o.idempotencyKey });
    return r.status === "failed" || r.status === "canceled" ? { ok: false, reason: "Stripe could not issue the refund." } : { ok: true, ref: r.id };
  } catch (e) {
    console.error("[stripe] refund failed", e);
    return { ok: false, reason: e instanceof Error ? e.message : "Stripe could not issue the refund." };
  }
}

/** Verifies the Stripe-Signature header against STRIPE_WEBHOOK_SECRET. Throws if invalid. */
export function verifyWebhook(rawBody: string, signature: string) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set.");
  return stripe().webhooks.constructEvent(rawBody, signature, secret);
}
