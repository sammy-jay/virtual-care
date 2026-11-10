import Link from "next/link";
import type { Metadata } from "next";
import { Card, Eyebrow, PageTitle, StatusTag } from "@/components/ui";
import { requirePatient } from "@/lib/auth/dal";
import { getActiveMembership } from "@/lib/care";
import { db } from "@/lib/db";
import { money, moneyShort } from "@/lib/format";
import { fmtShort } from "@/lib/time";

export const metadata: Metadata = { title: "Billing and receipts" };

export default async function BillingPage() {
  const user = await requirePatient();
  const tz = user.timeZone;
  const [m, payments, card] = await Promise.all([
    getActiveMembership(user.id),
    db.payment.findMany({ where: { patientId: user.id }, orderBy: { createdAt: "desc" }, include: { paymentMethod: true, refunds: true } }),
    db.paymentMethod.findFirst({ where: { userId: user.id, isDefault: true } }),
  ]);
  const price = m ? (m.currency === "NGN" ? m.plan.monthlyPriceNgn * 100 : m.plan.monthlyPriceCents) : 0;
  return (
    <div className="mx-auto max-w-[1000px]">
      <PageTitle title="Billing and receipts" subtitle="Every charge, with a downloadable receipt." />
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <Card>
          <Eyebrow>Plan</Eyebrow>
          <div className="mt-1.5 font-display text-xl">{m ? `${m.plan.name} · ${moneyShort(price, m.currency)}/mo` : "Pay per visit"}</div>
        </Card>
        <Card>
          <Eyebrow>Next charge</Eyebrow>
          <div className="mt-1.5 font-display text-xl">{m && !m.cancelAtPeriodEnd ? `${money(price, m.currency)} on ${fmtShort(m.currentPeriodEnd, tz)}` : "None scheduled"}</div>
        </Card>
        <Card>
          <Eyebrow>Card</Eyebrow>
          <div className="mt-1.5 font-display text-xl">{card ? `${card.brand} ${card.last4}` : <Link href="/portal/settings/payment-methods" className="text-forest">Add a card</Link>}</div>
        </Card>
      </div>
      <Card className="!p-0">
        {payments.length === 0 && <p className="p-6 text-sm text-body">No charges yet.</p>}
        {payments.map((p) => (
          <div key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line-soft px-6 py-4 first:border-t-0">
            <span className="w-16 text-sm font-semibold text-muted">{fmtShort(p.createdAt, tz)}</span>
            <div className="min-w-[180px] flex-1">
              <b className="block text-[15px]">{p.description}</b>
              <span className="text-[13px] text-muted">{p.note ?? (p.paymentMethod ? `Card ending ${p.paymentMethod.last4}` : "")}</span>
            </div>
            <span className="num font-bold">{money(p.amountCents, p.currency)}</span>
            <StatusTag status={p.status} />
            <Link href={p.status === "REFUNDED" && p.refunds[0] ? `/portal/billing/refunds/${p.refunds[0].id}` : `/portal/billing/${p.id}`} className="text-sm font-bold text-forest">
              {p.status === "REFUNDED" ? "Refund" : "Receipt"}
            </Link>
          </div>
        ))}
      </Card>
    </div>
  );
}
