import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DeviceCheck } from "@/components/video/device-check";
import { ButtonLink, Card, IconTile } from "@/components/ui";
import { requirePatient } from "@/lib/auth/dal";
import { getPractice } from "@/lib/care";
import { db } from "@/lib/db";
import { fmtTime, fmtWhen, zoneAbbr } from "@/lib/time";
import { roomWindow } from "@/lib/visit-labels";
import { enterWaitingRoom } from "../video-actions";

export const metadata: Metadata = { title: "Before you join" };

export default async function PrecheckPage({ params }: PageProps<"/portal/visits/[id]/precheck">) {
  const user = await requirePatient();
  const { id } = await params;
  const practice = await getPractice();
  const a = await db.appointment.findUnique({ where: { id }, include: { visitType: true } });
  if (!a || a.patientId !== user.id) notFound();
  const w = roomWindow(a, practice.roomOpensMinBefore, practice.roomClosesMinAfter);
  const tz = user.timeZone;

  if (a.status !== "SCHEDULED" || w.after)
    return (
      <Card className="mx-auto max-w-[620px] text-center">
        <div className="flex justify-center">
          <IconTile icon="lock" tone="gold" size={64} />
        </div>
        <h1 className="h-display mt-4 text-[32px]">This visit room is closed</h1>
        <p className="mt-2 text-[15.5px] text-body">
          Rooms open {practice.roomOpensMinBefore} minutes before the visit and close {practice.roomClosesMinAfter} minutes after it ends.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/portal/visits">Back to my visits</ButtonLink>
          <ButtonLink href="/portal/messages" variant="secondary">
            Message Dr. Oparaji
          </ButtonLink>
        </div>
      </Card>
    );

  return (
    <div className="mx-auto max-w-[1100px]">
      <div className="eyebrow">Before you join</div>
      <h1 className="h-display mt-2 text-[32px] md:text-[38px]">Check your camera and microphone</h1>
      <p className="mb-5 mt-1.5 text-[15.5px] text-body">
        {a.visitType.name} · {fmtWhen(a.startsAt, tz)}
        {w.before ? ` · the room opens at ${fmtTime(w.opens, tz)} ${zoneAbbr(tz, w.opens)}. Test now, join then.` : " · the room is open."}
      </p>
      {/* Joining before the room opens just returns here; the server checks the window. */}
      <DeviceCheck joinAction={enterWaitingRoom} appointmentId={a.id} backupUrl={a.backupUrl} />
    </div>
  );
}
