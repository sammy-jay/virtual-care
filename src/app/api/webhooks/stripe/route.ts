import { settleStripe } from "@/lib/checkout";

/**
 * Stripe webhook. Add this endpoint in the Stripe dashboard (Developers → Webhooks):
 *   https://YOUR-DOMAIN/api/webhooks/stripe
 *   events: checkout.session.completed, checkout.session.async_payment_succeeded,
 *           checkout.session.async_payment_failed, checkout.session.expired
 * and put its signing secret in STRIPE_WEBHOOK_SECRET. Requests without a valid signature are rejected.
 */
export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("missing signature", { status: 400 });
  const raw = await req.text();
  const { verifyWebhook } = await import("@/lib/payments/stripe");
  let event;
  try {
    event = verifyWebhook(raw, signature);
  } catch {
    return new Response("invalid signature", { status: 400 });
  }
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
    case "checkout.session.async_payment_failed":
    case "checkout.session.expired":
      try {
        await settleStripe(event.data.object.id);
      } catch (e) {
        console.error("[stripe webhook] settle failed", e);
        return new Response("retry", { status: 500 }); // Stripe retries with backoff
      }
  }
  return Response.json({ received: true });
}
