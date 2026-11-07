import { Avatar, ButtonLink, Tag } from "@/components/ui";
import { db } from "@/lib/db";
import { loadPatientRecord } from "@/lib/doctor-data";
import { initials } from "@/lib/format";
import { fmt, PRACTICE_TZ, zoneAbbr, nowMs } from "@/lib/time";
import { startCarePlan } from "../../../actions";
import { RecordTabs } from "./tabs";

export default async function PatientRecordLayout({ children, params }: LayoutProps<"/doctor/patients/[id]">) {
  const { id } = await params;
  const { patient, membership } = await loadPatientRecord(id);
  const lastNoPlan = await db.appointment.findFirst({
    where: { patientId: id, status: { in: ["COMPLETED", "SCHEDULED"] }, startsAt: { lte: new Date(nowMs() + 7 * 86400_000) } },
    orderBy: { startsAt: "desc" },
  });
  return (
    <div className="mx-auto max-w-[1140px]">
      <div className="mb-5 flex flex-wrap items-center gap-4">
        <Avatar initials={initials(patient.name)} size={56} />
        <div className="min-w-0 flex-1">
          <h1 className="h-display text-[30px] md:text-[34px]">{patient.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-body">
            <Tag tone={membership ? "sage" : "gray"}>{membership?.plan.name ?? "Pay per visit"}</Tag>
            {patient.profile?.city ?? "—"} · {zoneAbbr(patient.timeZone)} · Joined {fmt(patient.createdAt, PRACTICE_TZ, "d MMM")}
          </div>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <ButtonLink href={`/doctor/patients/${id}/messages`} variant="secondary" icon="chat">
            Message
          </ButtonLink>
          {lastNoPlan && (
            <form action={startCarePlan}>
              <input type="hidden" name="appointmentId" value={lastNoPlan.id} />
              <button className="inline-flex min-h-11 items-center gap-2 rounded-full border-[1.5px] border-forest bg-forest px-6 font-bold text-white">Write care plan</button>
            </form>
          )}
        </div>
      </div>
      <RecordTabs id={id} />
      <div className="mt-5">{children}</div>
    </div>
  );
}
