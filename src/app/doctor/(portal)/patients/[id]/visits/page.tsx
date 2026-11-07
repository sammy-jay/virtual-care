import { ButtonLink, Card, StatusTag } from "@/components/ui";
import { db } from "@/lib/db";
import { loadPatientRecord } from "@/lib/doctor-data";
import { money } from "@/lib/format";
import { fmt, PRACTICE_TZ } from "@/lib/time";

export default async function RecordVisits({ params }: PageProps<"/doctor/patients/[id]/visits">) {
  const { id } = await params;
  await loadPatientRecord(id);
  const visits = await db.appointment.findMany({ where: { patientId: id }, orderBy: { startsAt: "desc" }, include: { visitType: true, carePlan: true } });
  return (
    <Card className="!p-0">
      {visits.length === 0 && <p className="p-6 text-sm text-body">No visits yet.</p>}
      {visits.map((a) => (
        <div key={a.id} className="flex flex-wrap items-center gap-4 border-t border-line-soft px-6 py-4 first:border-t-0">
          <b className="w-24">{fmt(a.startsAt, PRACTICE_TZ, "EEE d MMM")}</b>
          <div className="min-w-[180px] flex-1">
            <b className="block">
              {a.visitType.name} · {a.visitType.durationMin} min
            </b>
            <span className="text-[13px] text-muted">
              {a.status === "COMPLETED" ? `Completed${a.carePlan?.status === "PUBLISHED" ? " · plan published" : a.carePlan ? " · plan draft" : ""}` : a.status.toLowerCase().replace("_", " ")}
            </span>
          </div>
          <StatusTag status={a.status} />
          <span className="w-20 text-right text-sm font-semibold">{a.pricingReason === "INCLUDED" ? "Included" : a.pricingReason === "FREE" ? "Free" : money(a.priceCents)}</span>
          <ButtonLink href={`/doctor/visits/${a.id}/notes`} size="sm" variant="secondary">
            Notes
          </ButtonLink>
        </div>
      ))}
    </Card>
  );
}
