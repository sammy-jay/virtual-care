import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { LiveRefresh } from "@/components/doctor/waiting-status";
import { DoctorPreview } from "./preview";
import { Button, ButtonLink, Card, Eyebrow, Row } from "@/components/ui";
import { requireDoctor } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { fmtTime, PRACTICE_TZ, zoneAbbr, zoneCity, nowMs } from "@/lib/time";
import { admitPatient } from "../../../../actions";

export const metadata: Metadata = { title: "Waiting room" };

export default async function DoctorWaitingRoom({ params }: PageProps<"/doctor/visits/[id]/waiting">) {
  await requireDoctor();
  const { id } = await params;
  const a = await db.appointment.findUnique({ where: { id }, include: { patient: true, visitType: true, membership: { include: { plan: true } } } });
  if (!a) notFound();
  if (a.admittedAt && a.status === "SCHEDULED") redirect(`/doctor/visits/${a.id}/room`);
  if (a.status !== "SCHEDULED") redirect(`/doctor/visits/${a.id}/notes`);
  const waitingMin = a.waitingSince ? Math.max(1, Math.round((nowMs() - a.waitingSince.getTime()) / 60000)) : 0;
  const ptz = a.patient?.timeZone ?? PRACTICE_TZ;
  return (
    <div className="mx-auto max-w-[1140px]">
      <LiveRefresh />
      <h1 className="h-display text-[34px] md:text-[38px]">Waiting room</h1>
      <p className="mt-1 text-[15.5px] text-body">
        {a.waitingSince ? `${a.patient?.name} is ready.` : `Waiting for ${a.patient?.name} to join.`} {a.visitType.name} · {fmtTime(a.startsAt, PRACTICE_TZ)} {zoneAbbr(PRACTICE_TZ, a.startsAt)}
      </p>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <DoctorPreview />
        <Card>
          <Eyebrow>Patient</Eyebrow>
          <div className="mt-1.5 font-display text-2xl">{a.patient?.name}</div>
          <p className="text-sm text-body">
            {zoneCity(ptz)} · {fmtTime(a.startsAt, ptz)} {zoneAbbr(ptz, a.startsAt)} · {a.pricingReason === "INCLUDED" ? `${a.membership?.plan.name} · included` : a.pricingReason === "FREE" ? "Free" : "Paid"}
          </p>
          <div className="mt-3">
            <Row label="Status">{a.waitingSince ? <span className="text-forest">In waiting room · {waitingMin} min</span> : <span className="text-muted">Not joined yet</span>}</Row>
            <Row label="Reason">{a.reason ?? "—"}</Row>
          </div>
          <form action={admitPatient} className="mt-5">
            <input type="hidden" name="id" value={a.id} />
            <Button className="w-full" icon="video">
              Admit patient
            </Button>
          </form>
          <ButtonLink href={`/doctor/appointments?id=${a.id}&dialog=noshow`} variant="ghost" className="mt-2 w-full">
            Mark no-show
          </ButtonLink>
        </Card>
      </div>
    </div>
  );
}
