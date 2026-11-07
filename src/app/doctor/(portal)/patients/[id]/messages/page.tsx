import { Composer, Thread } from "@/components/messages";
import { db } from "@/lib/db";
import { loadPatientRecord } from "@/lib/doctor-data";
import { ensureDoctorConversation, loadThread } from "@/lib/messaging";
import { PRACTICE_TZ } from "@/lib/time";
import { doctorSend } from "../../../../actions";

export default async function RecordMessages({ params }: PageProps<"/doctor/patients/[id]/messages">) {
  const { id } = await params;
  await loadPatientRecord(id);
  const c = await ensureDoctorConversation(id);
  const [thread, templates] = await Promise.all([loadThread(c.id, true, PRACTICE_TZ), db.messageTemplate.findMany({ orderBy: { sortOrder: "asc" } })]);
  return (
    <div className="flex min-h-[520px] flex-col overflow-hidden rounded-[20px] border border-line bg-white">
      <Thread messages={thread} />
      <Composer action={doctorSend} conversationId={c.id} placeholder="Write a reply…" templates={templates} />
    </div>
  );
}
