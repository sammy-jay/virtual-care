import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Alert, Card, Eyebrow, Row } from "@/components/ui";
import { requirePatient } from "@/lib/auth/dal";
import { releaseExpiredHolds } from "@/lib/booking";
import { db } from "@/lib/db";
import { money } from "@/lib/format";
import { providerFor } from "@/lib/payments";
import { fmt, fmtTime, zoneAbbr } from "@/lib/time";
import { PayVisitForm } from "./pay-form";

export const metadata: Metadata = { title: "Pay for your visit" };

export default async function PayVisitPage({ params, searchParams }: PageProps<"/portal/visits/[id]/pay">) {
  const user = await requirePatient();
  const { id } = await params;
  const { error } = await searchParams;
  await releaseExpiredHolds();
  const a = await db.appointment.findUnique({ where: { id }, include: { visitType: true, membership: { include: { plan: true } } } });
  if (!a || a.patientId !== user.id) notFound();
  if (a.status === "CANCELED") redirect(`/portal/visits?tab=past&id=${a.id}`); // hold expired
  if (a.status !== "PENDING_PAYMENT") redirect(`/portal/visits/${a.id}/confirmed`);
  // Only cards the account's processor can charge (Stripe for USD, Paystack for NGN).
  const provider = providerFor(a.currency);
  const methods = await db.paymentMethod.findMany({ where: { userId: user.id, provider }, orderBy: { createdAt: "asc" } });
  const tz = user.timeZone;
  const plan = a.membership?.plan;
  const discount = a.standardCents - a.priceCents;

  return (
    <div className="mx-auto max-w-[1000px]">
      <h1 className="h-display text-[34px] md:text-[38px]">Pay for your visit</h1>
      {a.pricingReason === "MEMBER_RATE" && plan ? (
        <>
          <p className="mt-1.5 text-[15.5px] text-body">
            {plan.includedVisits && plan.includedVisitTypeIds.includes(a.visitTypeId)
              ? `Your included ${plan.includedLabel ?? "visit"} is already used this month, so this visit is billed at your ${plan.name} member rate.`
              : `${a.visitType.name} is not included in ${plan.name}, so this visit is billed at your member rate.`}
          </p>
          <div className="mt-4 rounded-[20px] bg-gold-tint p-5 text-sm text-warning">
            <b className="text-ink">Why am I paying?</b> {plan.name} includes {plan.includedLabel ?? `${plan.includedVisits} visits`} per month.{" "}
            {plan.includedVisitTypeIds.includes(a.visitTypeId) ? "That allowance is used" : `${a.visitType.name} is not covered`}, so you get {plan.discountPct}% off the standard price.
          </div>
        </>
      ) : (
        <p className="mt-1.5 text-[15.5px] text-body">Pay now to confirm your time. Free cancellation up to 12 hours before, with automatic refund.</p>
      )}
      {error && (
        <Alert tone="error" className="mt-4">
          {String(error)}
        </Alert>
      )}
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <div className="flex flex-col gap-5">
          <Card>
            <Eyebrow>Visit</Eyebrow>
            <div className="mt-1.5 font-display text-2xl">
              {a.visitType.name} · {fmt(a.startsAt, tz, "EEE d MMM")}
            </div>
            <div className="text-sm text-body">
              {a.visitType.durationMin} min · {fmtTime(a.startsAt, tz)} {zoneAbbr(tz, a.startsAt)}
            </div>
          </Card>
          <Card>
            <Eyebrow>Payment method</Eyebrow>
            <div className="mt-3">
              <PayVisitForm appointmentId={a.id} name={user.name} amount={money(a.priceCents, a.currency)} methods={methods.map((m) => ({ id: m.id, label: `${m.brand} ending ${m.last4}`, isDefault: m.isDefault }))} provider={provider} />
            </div>
          </Card>
        </div>
        <Card className="h-fit">
          <Eyebrow>Order summary</Eyebrow>
          <Row label={a.visitType.name}>{money(a.standardCents, a.currency)}</Row>
          {discount > 0 && plan && <Row label={`${plan.name} member rate (${plan.discountPct}%)`}>−{money(discount, a.currency)}</Row>}
          <div className="mt-1 flex items-baseline justify-between border-t-2 border-ink pt-3.5">
            <b>Total today</b>
            <span className="font-display text-[30px]">{money(a.priceCents, a.currency)}</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
