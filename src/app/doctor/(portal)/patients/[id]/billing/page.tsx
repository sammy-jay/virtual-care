import Link from "@/components/market";
import { RefundModal } from "@/components/doctor/refund-modal";
import { Alert, Card, Eyebrow, StatusTag } from "@/components/ui";
import { allowanceUsed } from "@/lib/care";
import { db } from "@/lib/db";
import { loadPatientRecord } from "@/lib/doctor-data";
import { money, moneyShort } from "@/lib/format";
import { fmtShort, PRACTICE_TZ } from "@/lib/time";

export default async function RecordBilling({ params, searchParams }: PageProps<"/doctor/patients/[id]/billing">) {
  const { id } = await params;
  const sp = await searchParams;
  const { membership } = await loadPatientRecord(id);
  const payments = await db.payment.findMany({ where: { patientId: id, amountCents: { gt: 0 } }, orderBy: { createdAt: "desc" }, include: { patient: true, paymentMethod: true } });
  const used = membership ? await allowanceUsed(membership, new Date()) : 0;
  const reserved = membership ? await db.appointment.findFirst({ where: { membershipId: membership.id, usesAllowance: true, status: "SCHEDULED", startsAt: { gte: new Date() } } }) : null;
  const life = payments.filter((p) => p.status !== "FAILED");
  const total = life.reduce((s, p) => s + p.amountCents - p.refundedCents, 0);
  const refunding = typeof sp.refund === "string" ? payments.find((p) => p.id === sp.refund) : null;
  const base = `/doctor/patients/${id}/billing`;
  return (
    <>
      {sp.refunded === "1" && <Alert tone="success" className="mb-4">Refund issued. The patient was emailed.</Alert>}
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <Card>
          <Eyebrow>Plan</Eyebrow>
          <div className="mt-1.5 font-display text-2xl">{membership?.plan.name ?? "Pay per visit"}</div>
          {membership && (
            <div className="text-sm text-muted">
              {moneyShort(membership.plan.monthlyPriceCents)}/mo · renews {fmtShort(membership.currentPeriodEnd, PRACTICE_TZ)}
            </div>
          )}
        </Card>
        <Card>
          <Eyebrow>Allowance</Eyebrow>
          <div className="mt-1.5 font-display text-2xl">{membership?.plan.includedVisits ? `${used} of ${membership.plan.includedVisits}` : "—"}</div>
          <div className="text-sm text-muted">{reserved ? `Reserved for ${fmtShort(reserved.startsAt, PRACTICE_TZ)}` : "Nothing reserved"}</div>
        </Card>
        <Card>
          <Eyebrow>Lifetime paid</Eyebrow>
          <div className="mt-1.5 font-display text-2xl">{money(total)}</div>
          <div className="text-sm text-muted">{life.length} payments</div>
        </Card>
      </div>
      <Card className="!p-0">
        {payments.map((p) => (
          <div key={p.id} className="flex flex-wrap items-center gap-4 border-t border-line-soft px-6 py-4 first:border-t-0">
            <span className="w-16 text-sm text-muted">{fmtShort(p.createdAt, PRACTICE_TZ)}</span>
            <span className="min-w-[180px] flex-1 font-semibold">
              {p.description}
              {p.note && /before/i.test(p.note) ? ` (${p.note.toLowerCase()})` : ""}
            </span>
            <span className="num font-bold">{money(p.amountCents, p.currency)}</span>
            <StatusTag status={p.status} />
            {(p.status === "PAID" || p.status === "PARTIALLY_REFUNDED") && (
              <Link href={`${base}?refund=${p.id}`} scroll={false} className="text-sm font-bold text-forest">
                Refund
              </Link>
            )}
          </div>
        ))}
      </Card>
      {refunding && <RefundModal payment={refunding} closeHref={base} returnTo={base} error={sp.error === "amount"} />}
    </>
  );
}
