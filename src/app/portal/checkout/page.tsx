import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, Eyebrow, Row } from "@/components/ui";
import { requirePatient } from "@/lib/auth/dal";
import { getActiveMembership } from "@/lib/care";
import { db } from "@/lib/db";
import { cn, money } from "@/lib/format";
import { addMonths, fmtShort } from "@/lib/time";
import { CheckoutForm } from "./checkout-form";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage({ searchParams }: PageProps<"/portal/checkout">) {
  const user = await requirePatient();
  const sp = await searchParams;
  const plan = await db.plan.findUnique({ where: { slug: typeof sp.plan === "string" ? sp.plan : "thrive" } });
  if (!plan) redirect("/membership");
  if (await getActiveMembership(user.id)) redirect(`/portal/membership?dialog=switch&plan=${plan.slug}`);
  const profile = await db.patientProfile.findUnique({ where: { userId: user.id } });
  const ngn = sp.currency === "NGN" || (sp.currency !== "USD" && profile?.region === "NG");
  const methods = await db.paymentMethod.findMany({ where: { userId: user.id, ...(ngn ? { country: "NG" } : {}) } });
  const cur = ngn ? "NGN" : "USD";
  const amount = ngn ? plan.monthlyPriceNgn * 100 : plan.monthlyPriceCents;

  return (
    <div className="mx-auto max-w-[1000px]">
      <h1 className="h-display text-[34px] md:text-[38px]">Join {plan.name}</h1>
      <p className="mt-1.5 text-[15.5px] text-body">{ngn ? "Pay in naira with a Nigerian card or bank transfer." : "Cancel anytime. Your included visit resets every billing date."}</p>
      <div className="mt-4 flex gap-2" role="tablist" aria-label="Currency">
        {(["USD", "NGN"] as const).map((c) => (
          <Link key={c} href={`/portal/checkout?plan=${plan.slug}&currency=${c}`} role="tab" aria-selected={cur === c} className={cn("rounded-full px-4 py-2 text-sm font-bold", cur === c ? "bg-forest text-white" : "bg-white text-body")}>
            {c === "USD" ? "Pay in dollars" : "Pay in naira"}
          </Link>
        ))}
      </div>
      {ngn && (
        <div className="mt-4 rounded-[20px] bg-gold-tint p-4 text-sm text-warning">
          Prices are set in naira for Nigerian cards. You are charged {money(amount, "NGN")} each month; the rate does not change with exchange rates.
        </div>
      )}
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <div className="flex flex-col gap-5">
          <Card>
            <div className="flex items-start justify-between">
              <div>
                <Eyebrow>Your plan</Eyebrow>
                <div className="mt-1.5 font-display text-2xl">{plan.name}</div>
                <div className="text-sm text-body">
                  {plan.includedVisits ? `${plan.includedLabel} included · ` : ""}messaging · {plan.discountPct}% off {plan.includedVisits ? "extra " : ""}visits
                </div>
              </div>
              <Link href="/membership" className="text-sm font-bold text-forest">
                Change
              </Link>
            </div>
          </Card>
          <Card>
            <Eyebrow>{ngn ? "Pay with" : "Payment method"}</Eyebrow>
            <div className="mt-3">
              <CheckoutForm
                plan={plan.slug}
                currency={cur}
                name={user.name}
                label={`Pay ${money(amount, cur)} and join`}
                methods={methods.map((m) => ({ id: m.id, label: `${m.brand} ending ${m.last4}`, isDefault: m.isDefault }))}
                ngn={ngn}
              />
            </div>
          </Card>
        </div>
        <Card className="h-fit">
          <Eyebrow>Order summary</Eyebrow>
          <Row label={`${plan.name} monthly`}>{money(amount, cur)}</Row>
          {plan.includedVisits > 0 && <Row label="Included visits">{money(0, cur)} each month</Row>}
          <Row label={ngn ? "VAT" : "Tax"}>{ngn ? "Included" : money(0)}</Row>
          <div className="mt-1 flex items-baseline justify-between border-t-2 border-ink pt-3.5">
            <b>Total today</b>
            <span className="font-display text-[30px]">{money(amount, cur)}</span>
          </div>
          <p className="mt-3 text-[13px] text-muted">
            Renews {fmtShort(addMonths(new Date(), 1), user.timeZone)} at {money(amount, cur)}. Cancel anytime.
          </p>
        </Card>
      </div>
    </div>
  );
}
