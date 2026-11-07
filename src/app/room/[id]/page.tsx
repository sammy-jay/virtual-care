import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { VideoRoom } from "@/components/video/room";
import { requirePatient } from "@/lib/auth/dal";
import { getPractice } from "@/lib/care";
import { db } from "@/lib/db";
import { joinInfo } from "@/lib/video";
import { roomWindow } from "@/lib/visit-labels";

export const metadata: Metadata = { title: "Video visit" };

/** Full-screen patient room (07.2–07.4). */
export default async function PatientRoomPage({ params, searchParams }: PageProps<"/room/[id]">) {
  const user = await requirePatient();
  const { id } = await params;
  const { audio } = await searchParams;
  const practice = await getPractice();
  const a = await db.appointment.findUnique({ where: { id }, include: { visitType: true } });
  if (!a || a.patientId !== user.id) notFound();
  const w = roomWindow(a, practice.roomOpensMinBefore, practice.roomClosesMinAfter);
  if (a.status !== "SCHEDULED" || !w.isOpen) redirect(`/portal/visits/${a.id}/precheck`);
  const info = await joinInfo(a, { name: user.name, isDoctor: false });
  return (
    <VideoRoom
      appointmentId={a.id}
      title={`${a.visitType.name} with Dr. Oparaji`}
      remoteName="Dr. Oparaji"
      audioOnly={audio === "1"}
      dailyUrl={info.provider === "daily" ? info.url : undefined}
      backupUrl={a.backupUrl}
      onLeaveHref={`/portal/visits/${a.id}/ended`}
      role="patient"
    />
  );
}
