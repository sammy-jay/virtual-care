import { NextResponse, type NextRequest } from "next/server";
import { settlePaystack, settleStripe, type Outcome } from "@/lib/checkout";
import { getMarket } from "@/lib/market-server";
import { withMarket } from "@/lib/market";

/**
 * Where Stripe Checkout and Paystack send the patient back. The query string is only a pointer:
 * the payment is confirmed by asking the provider's API (src/lib/checkout.ts), never trusted as-is.
 */
export async function GET(req: NextRequest, ctx: RouteContext<"/portal/billing/return/[provider]">) {
  const { provider } = await ctx.params;
  const q = req.nextUrl.searchParams;
  let outcome: Outcome;
  try {
    if (provider === "stripe" && q.get("session_id")) outcome = await settleStripe(q.get("session_id")!);
    else if (provider === "paystack" && (q.get("reference") || q.get("trxref"))) outcome = await settlePaystack((q.get("reference") || q.get("trxref"))!);
    else outcome = { status: "failed", href: "/portal/billing" };
  } catch (e) {
    // Provider unreachable: the webhook will still settle it.
    console.error("[checkout] return settle failed", e);
    outcome = { status: "pending", href: "/portal/billing?processing=1" };
  }
  const market = await getMarket();
  return NextResponse.redirect(new URL(withMarket(outcome.href, market), req.url), { status: 303 });
}
