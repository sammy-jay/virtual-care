import Link from "@/components/market";
import { LineChart } from "@/components/charts";
import { ButtonLink, Card, Eyebrow, Row, StatusTag } from "@/components/ui";
import { allowanceUsed } from "@/lib/care";
import { db } from "@/lib/db";
import { loadPatientRecord } from "@/lib/doctor-data";
import { money, moneyShort } from "@/lib/format";
import { fmt, fmtShort, fmtTime, PRACTICE_TZ, zoneAbbr } from "@/lib/time";

export default async function PatientRecordOverview({ params }: PageProps<"/doctor/patients/[id]">) {
  const { id } = await params;
  const { patient, membership } = await loadPatientRecord(id);
  const tz = PRACTICE_TZ;
  const [next, history, paid, weights] = await Promise.all([
    db.appointment.findFirst({ where: { patientId: id, status: "SCHEDULED", endsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" }, include: { visitType: true } }),
    db.appointment.findMany({ where: { patientId: id, status: { in: ["COMPLETED", "NO_SHOW"] } }, orderBy: { startsAt: "desc" }, take: 5, include: { visitType: true, carePlan: true } }),
    db.payment.aggregate({ where: { patientId: id, status: { in: ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"] } }, _sum: { amountCents: true, refundedCents: true } }),
    db.measurement.findMany({ where: { patientId: id, kind: "WEIGHT" }, orderBy: { takenAt: "asc" } }),
  ]);
  const used = membership ? await allowanceUsed(membership, new Date()) : 0;
  const lifetime = (paid._sum.amountCents ?? 0) - (paid._sum.refundedCents ?? 0);
  const p = patient.profile;
  return (
    <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
      <div className="flex flex-col gap-5">
        <Card>
          <Eyebrow>Next visit</Eyebrow>
          {next ? (
            <>
              <div className="mt-1.5 font-display text-2xl">
                {next.visitType.name} · {fmt(next.startsAt, tz, "EEE d MMM")}
              </div>
              <p className="text-sm text-body">
                {fmtTime(next.startsAt, tz)} {zoneAbbr(tz, next.startsAt)} · {fmtTime(next.startsAt, patient.timeZone)} {zoneAbbr(patient.timeZone, next.startsAt)} ·{" "}
                {next.pricingReason === "INCLUDED" ? `Included in ${membership?.plan.name}` : next.pricingReason === "FREE" ? "Free" : money(next.priceCents, next.currency)}
              </p>
              {next.reason && <p className="mt-2 rounded-xl bg-canvas px-3 py-2 text-sm">{next.reason}</p>}
              <div className="mt-4 flex gap-2.5">
                <ButtonLink href={`/doctor/visits/${next.id}/waiting`} icon="video" size="sm">
                  Start visit
                </ButtonLink>
                <ButtonLink href={`/doctor/appointments?id=${next.id}&dialog=reschedule`} variant="secondary" size="sm">
                  Reschedule
                </ButtonLink>
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-body">No upcoming visit.</p>
          )}
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <Eyebrow>Visit history</Eyebrow>
            <Link href={`/doctor/patients/${id}/visits`} className="text-[13px] font-bold text-forest">
              All visits →
            </Link>
          </div>
          {history.length === 0 && <p className="mt-2 text-sm text-body">No completed visits yet.</p>}
          {history.map((a) => (
            <div key={a.id} className="flex items-center justify-between border-t border-line-soft py-3 first-of-type:mt-2">
              <span>
                {fmtShort(a.startsAt, tz)} · {a.visitType.name}
              </span>
              {a.carePlan?.status === "PUBLISHED" ? <StatusTag status="PUBLISHED" /> : <StatusTag status={a.status} />}
            </div>
          ))}
        </Card>
        {weights.length > 1 && (
          <Card>
            <Eyebrow>Weight (kg)</Eyebrow>
            <div className="mt-3">
              <LineChart label="Weight" unit=" kg" points={weights.map((m) => ({ x: fmtShort(m.takenAt, tz), y: m.value ?? 0 }))} height={150} />
            </div>
          </Card>
        )}
      </div>
      <div className="flex flex-col gap-5">
        <Card>
          <Eyebrow>Health profile</Eyebrow>
          <div className="mt-2">
            <Row label="Date of birth">{p?.dateOfBirth ? fmt(p.dateOfBirth, "UTC", "d MMM yyyy") : "—"}</Row>
            <Row label="Medications">{p?.medications || "—"}</Row>
            <Row label="Allergies">{p?.allergies || "—"}</Row>
            <Row label="Conditions">{p?.conditions || "—"}</Row>
            <Row label="Goal">{p?.goals || "—"}</Row>
            <Row label="Emergency contact">{p?.emergencyContact?.name ? `${p.emergencyContact.name} · ${p.emergencyContact.phone ?? ""}` : "—"}</Row>
            <Row label="Phone">{patient.phone || "—"}</Row>
          </div>
        </Card>
        <Card>
          <Eyebrow>Billing</Eyebrow>
          <div className="mt-2">
            <Row label="Plan">{membership ? `${membership.plan.name} · ${moneyShort(membership.plan.monthlyPriceCents)}/mo` : "Pay per visit"}</Row>
            {membership && membership.plan.includedVisits > 0 && (
              <Row label="Included visit">
                {used} of {membership.plan.includedVisits} {next?.usesAllowance ? "reserved" : "used"}
              </Row>
            )}
            <Row label="Lifetime paid">{money(lifetime)}</Row>
          </div>
        </Card>
      </div>
    </div>
  );
}
