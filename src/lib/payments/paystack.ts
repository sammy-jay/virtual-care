import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { secretKey, type ChargeResult, type SavedCard } from "./index";

/**
 * Paystack: Nigeria accounts. Charges in NGN (amounts in kobo). Only the secret key is used,
 * server-side. Card details are entered on Paystack's hosted checkout page.
 */
const BASE = "https://api.paystack.co";

export type PaystackAuthorization = {
  authorization_code: string;
  last4: string;
  exp_month: string;
  exp_year: string;
  card_type?: string;
  brand?: string;
  bank?: string;
  country_code?: string;
  channel: string;
  reusable: boolean;
  signature?: string;
};

export type PaystackTransaction = {
  id: number;
  status: "success" | "failed" | "abandoned" | "ongoing" | "pending" | "processing" | "queued" | "reversed";
  reference: string;
  amount: number;
  currency: string;
  gateway_response?: string;
  channel?: string;
  metadata?: Record<string, unknown> | string | null;
  authorization?: PaystackAuthorization;
  customer?: { email: string };
};

async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const key = secretKey("PAYSTACK_SECRET_KEY");
  const res = await fetch(BASE + path, {
    method: init.method ?? "GET",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const json = (await res.json().catch(() => null)) as { status?: boolean; message?: string; data?: T } | null;
  if (!res.ok || !json?.status) throw new PaystackError(json?.message ?? `Paystack ${res.status}`, res.status);
  return json.data as T;
}

export class PaystackError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function initialize(o: { email: string; amountKobo: number; reference: string; callbackUrl: string; cancelUrl: string; cardOnly: boolean; metadata: Record<string, string> }) {
  return api<{ authorization_url: string; access_code: string; reference: string }>("/transaction/initialize", {
    method: "POST",
    body: {
      email: o.email,
      amount: o.amountKobo,
      currency: "NGN",
      reference: o.reference,
      callback_url: o.callbackUrl,
      // Memberships renew from a saved card, so they must be paid by card. Visits can use any channel.
      channels: o.cardOnly ? ["card"] : ["card", "bank", "bank_transfer", "ussd"],
      metadata: { ...o.metadata, cancel_action: o.cancelUrl },
    },
  });
}

/** Always confirm a payment with this call; never trust redirect parameters or webhook bodies alone. */
export function verify(reference: string) {
  return api<PaystackTransaction>(`/transaction/verify/${encodeURIComponent(reference)}`);
}

export function cardFromAuthorization(auth: PaystackAuthorization | undefined, email: string): SavedCard | null {
  if (!auth || !auth.reusable || auth.channel !== "card") return null;
  const raw = (auth.card_type || auth.brand || "Card").trim();
  const brand = /verve/i.test(raw) ? "Verve" : /master/i.test(raw) ? "Mastercard" : /visa/i.test(raw) ? "Visa" : raw.charAt(0).toUpperCase() + raw.slice(1);
  return {
    provider: "paystack",
    providerRef: auth.authorization_code,
    providerCustomer: email,
    fingerprint: auth.signature ?? null,
    brand,
    last4: auth.last4,
    expMonth: Number(auth.exp_month),
    expYear: Number(auth.exp_year),
    country: auth.country_code || "NG",
  };
}

/** Charge a saved card (authorization) with no customer present. */
export async function chargeAuthorization(o: { authorizationCode: string; email: string; amountKobo: number; reference: string }): Promise<ChargeResult> {
  try {
    const tx = await api<{ status: string; reference: string; gateway_response?: string }>("/transaction/charge_authorization", {
      method: "POST",
      body: { authorization_code: o.authorizationCode, email: o.email, amount: o.amountKobo, currency: "NGN", reference: o.reference },
    });
    if (tx.status === "success") return { ok: true, ref: tx.reference };
    return { ok: false, reason: tx.gateway_response && tx.gateway_response !== "Approved" ? `${tx.gateway_response}. Try another card.` : "This card was declined. Try another card." };
  } catch (e) {
    console.error("[paystack] charge failed", e);
    return { ok: false, reason: e instanceof PaystackError && e.status < 500 ? `${e.message}. Try another card.` : "We could not reach the card processor. Please try again in a minute." };
  }
}

export async function refundPaystack(o: { reference: string; amountKobo: number }): Promise<ChargeResult> {
  try {
    const r = await api<{ id?: number; status?: string }>("/refund", { method: "POST", body: { transaction: o.reference, amount: o.amountKobo } });
    return { ok: true, ref: `paystack_refund_${r.id ?? o.reference}` };
  } catch (e) {
    console.error("[paystack] refund failed", e);
    return { ok: false, reason: e instanceof Error ? e.message : "Paystack could not issue the refund." };
  }
}

/** x-paystack-signature is an HMAC-SHA512 of the raw body, keyed with the secret key. */
export function verifySignature(rawBody: string, signature: string | null) {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key || !signature) return false;
  const expected = Buffer.from(createHmac("sha512", key).update(rawBody).digest("hex"));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function metadataOf(tx: PaystackTransaction): Record<string, unknown> {
  if (!tx.metadata) return {};
  if (typeof tx.metadata === "string") {
    try {
      return JSON.parse(tx.metadata) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return tx.metadata;
}
