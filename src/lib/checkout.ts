import "server-only";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import type { Checkout, Currency, PaymentKind } from "@prisma/client";
import { announcePaid, createPayment, refundPayment, saveCard } from "@/lib/billing";
import { getActiveMembership } from "@/lib/care";
import { db } from "@/lib/db";
import { fromDbMarket, withMarket } from "@/lib/market";
import { providerFor, type SavedCard } from "@/lib/payments";
import { addMonths } from "@/lib/time";
import { confirmBooked } from "@/lib/visits";

/**
 * Hosted checkout (live payments).
 *
 *   start → the patient is redirected to Stripe Checkout (USD) or Paystack (NGN) and enters the
 *           card there; we never see card numbers.
 *   settle → runs from the return URL and from the provider's signed webhook, whichever arrives
 *           first. It re-reads the transaction from the provider's API, checks the amount and
 *           currency against what we asked for, and fulfils exactly once (atomic status claim).
 */

/** Paystack needs a real charge to save a card; this small amount is refunded straight away. */
export const PAYSTACK_CARD_CHECK_KOBO = 10_000; // ₦100

type User = { id: string; email: string; name: string; market: "US" | "NG"; stripeCustomerId: string | null };

export type Purpose =
  | { kind: "VISIT"; appointmentId: string; amountCents: number; currency: Currency }
  | { kind: "MEMBERSHIP"; planId: string; planName: string; amountCents: number; currency: Currency }
  | { kind: "CARD"; currency: Currency };

const origin = () => (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** Creates the hosted checkout and returns the provider URL to redirect to. */
export async function startCheckout(user: User, purpose: Purpose, cancelPath: string): Promise<string> {
  const market = fromDbMarket(user.market);
  const provider = providerFor(purpose.currency);
  if (provider === "mock") throw new Error("Hosted checkout is only used with PAYMENTS_PROVIDER=live.");
  // Line items carry no clinical detail (visit types stay out of the processor's records).
  const description = purpose.kind === "VISIT" ? "Video visit with Dr. Oparaji" : purpose.kind === "MEMBERSHIP" ? `${purpose.planName} membership (monthly)` : "Save a card";
  const amountCents = purpose.kind === "CARD" ? (provider === "paystack" ? PAYSTACK_CARD_CHECK_KOBO : 0) : purpose.amountCents;

  const co = await db.checkout.create({
    data: {
      userId: user.id,
      purpose: purpose.kind,
      provider,
      amountCents,
      currency: purpose.currency,
      description,
      appointmentId: purpose.kind === "VISIT" ? purpose.appointmentId : null,
      planId: purpose.kind === "MEMBERSHIP" ? purpose.planId : null,
    },
  });
  const back = `${origin()}${withMarket(cancelPath, market)}`;

  if (provider === "stripe") {
    const s = await import("@/lib/payments/stripe");
    const customer = await s.ensureCustomer(user, (id) => db.user.update({ where: { id: user.id }, data: { stripeCustomerId: id } }));
    const successUrl = `${origin()}${withMarket("/portal/billing/return/stripe", market)}?session_id={CHECKOUT_SESSION_ID}`;
    const session =
      purpose.kind === "CARD"
        ? await s.createSetupCheckout({ checkoutId: co.id, customer, successUrl, cancelUrl: back })
        : await s.createPaymentCheckout({ checkoutId: co.id, customer, amountCents, label: description, saveCard: true, successUrl, cancelUrl: back });
    await db.checkout.update({ where: { id: co.id }, data: { ref: session.id } });
    if (!session.url) throw new Error("Stripe did not return a checkout URL.");
    return session.url;
  }

  const p = await import("@/lib/payments/paystack");
  const reference = `vc_${co.id}_${randomBytes(4).toString("hex")}`;
  await db.checkout.update({ where: { id: co.id }, data: { ref: reference } });
  const init = await p.initialize({
    email: user.email,
    amountKobo: amountCents,
    reference,
    callbackUrl: `${origin()}${withMarket("/portal/billing/return/paystack", market)}`,
    cancelUrl: back,
    cardOnly: purpose.kind !== "VISIT",
    metadata: { checkoutId: co.id, userId: user.id, purpose: purpose.kind },
  });
  return init.authorization_url;
}

// ─── Settling ────────────────────────────────────────────────────────────────

export type Outcome = { status: "paid" | "card_saved" | "pending" | "failed" | "refunded"; href: string; message?: string };

const failedHref = (co: Checkout, reason: string) => {
  const retry = co.purpose === "VISIT" ? `/portal/visits/${co.appointmentId}/pay` : co.purpose === "MEMBERSHIP" ? "/portal/membership" : "/portal/settings/payment-methods";
  return `${retry}?error=${encodeURIComponent(reason)}`;
};

/** Where to send the patient for a checkout that is already settled. */
async function settledOutcome(co: Checkout): Promise<Outcome> {
  if (co.status === "FAILED") return { status: "failed", href: failedHref(co, co.failureReason ?? "The payment did not go through.") };
  if (co.purpose === "CARD") return { status: "card_saved", href: "/portal/settings/payment-methods?added=1" };
  if (co.status === "REFUNDED") {
    return co.purpose === "VISIT"
      ? { status: "refunded", href: `/portal/visits?tab=past&id=${co.appointmentId}&released=1` }
      : { status: "refunded", href: "/portal/membership?refunded=1" };
  }
  return co.purpose === "VISIT" ? { status: "paid", href: `/portal/visits/${co.appointmentId}/confirmed` } : { status: "paid", href: "/portal/membership?joined=1" };
}

async function fail(co: Checkout, reason: string): Promise<Outcome> {
  await db.checkout.updateMany({ where: { id: co.id, status: "OPEN" }, data: { status: "FAILED", failureReason: reason } });
  return { status: "failed", href: failedHref(co, reason) };
}

/** Common path once the provider says the money arrived. Runs at most once per checkout. */
async function fulfil(co: Checkout, got: { amount: number; currency: string; chargeRef: string; card: SavedCard | null }): Promise<Outcome> {
  if (got.amount !== co.amountCents || got.currency.toUpperCase() !== co.currency) {
    console.error(`[checkout] ${co.id} amount mismatch: expected ${co.amountCents} ${co.currency}, got ${got.amount} ${got.currency}`);
    return fail(co, "The payment amount did not match. You have not been charged twice; contact the practice if money left your account.");
  }
  // Claim it: only one of (return URL, webhook, retry) gets past this line.
  const claimed = await db.checkout.updateMany({ where: { id: co.id, status: "OPEN" }, data: { status: "PAID" } });
  if (claimed.count === 0) return settledOutcome((await db.checkout.findUniqueOrThrow({ where: { id: co.id } })));

  const method = got.card ? await saveCard(co.userId, got.card) : null;
  if (co.purpose === "CARD") {
    // Paystack's card check charge goes straight back.
    if (co.provider === "paystack" && co.amountCents > 0) {
      const { refundPaystack } = await import("@/lib/payments/paystack");
      const r = await refundPaystack({ reference: got.chargeRef, amountKobo: co.amountCents });
      if (!r.ok) console.error(`[checkout] card-check refund failed for ${co.ref}: ${r.reason}`);
    }
    return { status: "card_saved", href: "/portal/settings/payment-methods?added=1" };
  }

  const kind: PaymentKind = co.purpose === "VISIT" ? "VISIT" : "MEMBERSHIP";
  const payment = await createPayment({
    patientId: co.userId,
    kind,
    status: "PAID",
    amountCents: co.amountCents,
    currency: co.currency,
    description: co.purpose === "VISIT" ? await visitLabel(co.appointmentId) : co.description.replace(" membership (monthly)", " monthly"),
    note: method ? `${method.brand} ending ${method.last4}` : co.provider === "paystack" ? "Paid with Paystack" : "Card",
    paymentMethodId: method?.id ?? null,
    provider: co.provider,
    providerRef: got.chargeRef,
    appointmentId: co.appointmentId,
  });
  await db.checkout.update({ where: { id: co.id }, data: { paymentId: payment.id } });
  await announcePaid(payment);

  if (co.purpose === "VISIT") {
    const a = await db.appointment.findUnique({ where: { id: co.appointmentId! } });
    const confirmed = await db.appointment.updateMany({ where: { id: co.appointmentId!, status: "PENDING_PAYMENT" }, data: { status: "SCHEDULED", paymentId: payment.id } });
    if (!a || confirmed.count === 0) {
      // The 30-minute hold ran out (or the visit was cancelled) before the payment finished.
      await refundPayment(payment.id, payment.amountCents, "The time was released before payment finished");
      await db.checkout.update({ where: { id: co.id }, data: { status: "REFUNDED" } });
      return { status: "refunded", href: `/portal/visits?tab=past&id=${co.appointmentId}&released=1` };
    }
    await confirmBooked(a.id);
    revalidatePath("/portal", "layout");
    return { status: "paid", href: `/portal/visits/${a.id}/confirmed` };
  }

  // Membership: create it now that the first month is paid.
  if (await getActiveMembership(co.userId)) {
    await refundPayment(payment.id, payment.amountCents, "You already have an active membership");
    await db.checkout.update({ where: { id: co.id }, data: { status: "REFUNDED" } });
    return { status: "refunded", href: "/portal/membership?refunded=1" };
  }
  const start = new Date();
  const membership = await db.membership.create({
    data: { patientId: co.userId, planId: co.planId!, currency: co.currency, currentPeriodStart: start, currentPeriodEnd: addMonths(start, 1), paymentMethodId: method?.id ?? null },
  });
  await db.payment.update({ where: { id: payment.id }, data: { membershipId: membership.id } });
  revalidatePath("/portal", "layout");
  return { status: "paid", href: "/portal/membership?joined=1" };
}

async function visitLabel(appointmentId: string | null) {
  if (!appointmentId) return "Video visit";
  const a = await db.appointment.findUnique({ where: { id: appointmentId }, include: { visitType: true } });
  return a?.visitType.name ?? "Video visit";
}

export async function settleStripe(sessionId: string): Promise<Outcome> {
  const co = await db.checkout.findFirst({ where: { ref: sessionId, provider: "stripe" } });
  if (!co) return { status: "failed", href: "/portal/billing", message: "We could not find that checkout." };
  if (co.status !== "OPEN") return settledOutcome(co);
  const s = await import("@/lib/payments/stripe");
  const session = await s.retrieveSession(sessionId);
  if (session.metadata?.checkoutId !== co.id) return fail(co, "This checkout does not match.");
  const customer = typeof session.customer === "string" ? session.customer : (session.customer?.id ?? "");

  if (session.mode === "setup") {
    const si = session.setup_intent;
    if (session.status !== "complete" || !si || typeof si === "string" || si.status !== "succeeded") return session.status === "expired" ? fail(co, "The checkout expired.") : { status: "pending", href: "/portal/settings/payment-methods" };
    const card = s.cardFromPaymentMethod(si.payment_method, customer);
    if (!card) return fail(co, "That card could not be saved.");
    return fulfil(co, { amount: 0, currency: co.currency, chargeRef: si.id, card });
  }

  if (session.payment_status !== "paid") {
    if (session.status === "expired") return fail(co, "The checkout expired before payment.");
    return { status: "pending", href: failedHref(co, "Your payment is still processing. We will email you when it goes through.") };
  }
  const pi = session.payment_intent;
  if (!pi || typeof pi === "string") return { status: "pending", href: "/portal/billing" };
  return fulfil(co, { amount: session.amount_total ?? 0, currency: session.currency ?? "", chargeRef: pi.id, card: s.cardFromPaymentMethod(pi.payment_method, customer) });
}

export async function settlePaystack(reference: string): Promise<Outcome> {
  const co = await db.checkout.findFirst({ where: { ref: reference, provider: "paystack" } });
  if (!co) return { status: "failed", href: "/portal/billing", message: "We could not find that payment." };
  if (co.status !== "OPEN") return settledOutcome(co);
  const p = await import("@/lib/payments/paystack");
  const tx = await p.verify(reference);
  if (p.metadataOf(tx).checkoutId !== co.id) return fail(co, "This payment does not match.");
  if (tx.status === "failed" || tx.status === "reversed") return fail(co, tx.gateway_response ? `${tx.gateway_response}.` : "The payment did not go through.");
  if (tx.status !== "success") return { status: "pending", href: failedHref(co, "Your payment is not complete yet. If you were charged, we will confirm it by email shortly.") };
  const email = tx.customer?.email ?? (await db.user.findUniqueOrThrow({ where: { id: co.userId } })).email;
  return fulfil(co, { amount: tx.amount, currency: tx.currency, chargeRef: tx.reference, card: p.cardFromAuthorization(tx.authorization, email) });
}

/** The patient's own site prefix for a portal path (return URLs land on /ng for Nigeria accounts). */
export function portalHref(path: string, market: "US" | "NG") {
  return withMarket(path, fromDbMarket(market));
}
