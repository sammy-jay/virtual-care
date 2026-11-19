import { settlePaystack } from "@/lib/checkout";

/**
 * Paystack webhook. In the Paystack dashboard (Settings → API Keys & Webhooks) set the webhook URL:
 *   https://YOUR-DOMAIN/api/webhooks/paystack
 * Every request is checked against the x-paystack-signature HMAC; the transaction is then re-verified
 * with Paystack's API before anything is fulfilled.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const { verifySignature } = await import("@/lib/payments/paystack");
  if (!verifySignature(raw, req.headers.get("x-paystack-signature"))) return new Response("invalid signature", { status: 401 });
  let event: { event?: string; data?: { reference?: string } };
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response("bad json", { status: 400 });
  }
  if (event.event === "charge.success" && event.data?.reference?.startsWith("vc_")) {
    try {
      await settlePaystack(event.data.reference);
    } catch (e) {
      console.error("[paystack webhook] settle failed", e);
      return new Response("retry", { status: 500 }); // Paystack retries
    }
  }
  return new Response("ok", { status: 200 });
}
