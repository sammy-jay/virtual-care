import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { VideoRoom } from "@/components/video/room";
import { Button, ButtonLink, Card, Eyebrow, Row } from "@/components/ui";
import { requireDoctor } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { fmtShort, PRACTICE_TZ } from "@/lib/time";
import { joinInfo } from "@/lib/video";
import { endVisit } from "../../../../actions";
import { QuickNotes } from "./quick-notes";

export const metadata: Metadata = { title: "Visit in progress" };

export default async function DoctorVideoRoom({ params }: PageProps<"/doctor/visits/[id]/room">) {
  const doc = await requireDoctor();
  const { id } = await params;
  const a = await db.appointment.findUnique({ where: { id }, include: { patient: { include: { profile: true } }, visitType: true, membership: { include: { plan: true } }, note: true } });
  if (!a) notFound();
  if (a.status !== "SCHEDULED") redirect(`/doctor/visits/${a.id}/notes`);
  if (!a.admittedAt) redirect(`/doctor/visits/${a.id}/waiting`);
  const lastPlan = await db.carePlan.findFirst({ where: { patientId: a.patientId!, status: "PUBLISHED" }, orderBy: { publishedAt: "desc" } });
  const info = await joinInfo(a, { name: doc.name, isDoctor: true });
  return (
    <div className="mx-auto grid max-w-[1240px] gap-5 lg:grid-cols-[1.7fr_1fr]">
      <div className="min-h-[520px]">
        <VideoRoom
          compact
          role="doctor"
          appointmentId={a.id}
          title={a.patient?.name ?? "Patient"}
          remoteName={a.patient?.name ?? "Patient"}
          dailyUrl={info.provider === "daily" ? info.url : undefined}
          onLeaveHref={`/doctor/visits/${a.id}/notes`}
          endAction={endVisit}
        />
      </div>
      <div className="flex flex-col gap-4">
        <Card>
          <Eyebrow>Patient</Eyebrow>
          <div className="mt-1 font-display text-xl">{a.patient?.name}</div>
          <p className="text-sm text-muted">
            {a.membership?.plan.name ?? "Pay per visit"} · {a.visitType.name} {a.pricingReason === "INCLUDED" ? "included" : ""}
          </p>
          <div className="mt-2">
            <Row label="Medications">{a.patient?.profile?.medications || "—"}</Row>
            <Row label="Allergies">{a.patient?.profile?.allergies || "—"}</Row>
            <Row label="Last plan">{lastPlan?.publishedAt ? fmtShort(lastPlan.publishedAt, PRACTICE_TZ) : "—"}</Row>
          </div>
        </Card>
        <Card>
          <Eyebrow>Quick notes</Eyebrow>
          <QuickNotes id={a.id} initial={a.note?.quickNotes ?? ""} />
        </Card>
        <div className="flex gap-2.5">
          <ButtonLink href={`/doctor/visits/${a.id}/notes`} variant="secondary" className="flex-1" target="_blank">
            Open full notes
          </ButtonLink>
          <form action={endVisit} className="flex-1">
            <input type="hidden" name="id" value={a.id} />
            <Button variant="danger" className="w-full">
              End visit
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
