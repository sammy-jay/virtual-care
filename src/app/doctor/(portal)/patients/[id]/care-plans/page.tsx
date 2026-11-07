import { ButtonLink, Card, StatusTag } from "@/components/ui";
import { db } from "@/lib/db";
import { loadPatientRecord } from "@/lib/doctor-data";
import { fmtShort, PRACTICE_TZ } from "@/lib/time";

export default async function RecordCarePlans({ params }: PageProps<"/doctor/patients/[id]/care-plans">) {
  const { id } = await params;
  await loadPatientRecord(id);
  const plans = await db.carePlan.findMany({ where: { patientId: id }, orderBy: { createdAt: "desc" }, include: { appointment: { include: { visitType: true } } } });
  return (
    <Card className="!p-0">
      {plans.length === 0 && <p className="p-6 text-sm text-body">No care plans yet. Use “Write care plan” above.</p>}
      {plans.map((p) => (
        <div key={p.id} className="flex flex-wrap items-center gap-4 border-t border-line-soft px-6 py-4 first:border-t-0">
          <div className="min-w-[200px] flex-1">
            <b className="block">
              {p.appointment.visitType.name} · {fmtShort(p.appointment.startsAt, PRACTICE_TZ)}
            </b>
            <span className="line-clamp-1 text-[13px] text-muted">{p.summary || "No summary yet"}</span>
          </div>
          <StatusTag status={p.status} />
          <ButtonLink href={`/doctor/care-plans/${p.id}`} size="sm" variant="secondary">
            {p.status === "DRAFT" ? "Continue" : "Edit"}
          </ButtonLink>
        </div>
      ))}
    </Card>
  );
}
