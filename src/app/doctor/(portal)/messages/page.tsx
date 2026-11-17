import Link from "@/components/market";
import type { Metadata } from "next";
import { Composer, Thread } from "@/components/messages";
import { ButtonLink, EmptyState, PageTitle } from "@/components/ui";
import { requireDoctor } from "@/lib/auth/dal";
import { unreadForDoctor } from "@/lib/care";
import { db } from "@/lib/db";
import { cn } from "@/lib/format";
import { loadThread } from "@/lib/messaging";
import { listDateLabel, PRACTICE_TZ } from "@/lib/time";
import { doctorSend } from "../../actions";

export const metadata: Metadata = { title: "Messages" };

export default async function DoctorMessagesPage({ searchParams }: PageProps<"/doctor/messages">) {
  await requireDoctor();
  const sp = await searchParams;
  const [convos, unread, templates] = await Promise.all([
    db.conversation.findMany({
      where: { kind: "doctor", patient: { deletedAt: null } },
      orderBy: { lastMessageAt: "desc" },
      include: { patient: true, messages: { orderBy: { createdAt: "desc" }, take: 1 }, _count: { select: { messages: { where: { fromDoctor: false, readAt: null } } } } },
    }),
    unreadForDoctor(),
    db.messageTemplate.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  const withMsgs = convos.filter((c) => c.messages.length);
  const active = withMsgs.find((c) => c.id === sp.c) ?? withMsgs[0];
  const thread = active ? await loadThread(active.id, true, PRACTICE_TZ) : [];
  return (
    <div className="mx-auto max-w-[1200px]">
      <PageTitle title="Messages" subtitle={`${unread} unread`} actions={<ButtonLink href="/doctor/messages/templates" variant="secondary">Message templates</ButtonLink>} />
      {!active ? (
        <EmptyState icon="chat" title="No conversations yet" body="Patients who are members, or within 14 days of a visit, can message you." />
      ) : (
        <div className="grid overflow-hidden rounded-[20px] border border-line bg-white md:grid-cols-[320px_1fr]" style={{ minHeight: 580 }}>
          <div className="max-h-[640px] overflow-y-auto border-b border-line md:border-b-0 md:border-r">
            {withMsgs.map((c) => (
              <Link key={c.id} href={`/doctor/messages?c=${c.id}`} className={cn("flex flex-col border-b border-line-soft px-5 py-4", c.id === active.id && "bg-sage")}>
                <span className="flex items-center justify-between gap-2 text-[15px] font-bold">
                  <span className="truncate">{c.patient.name}</span>
                  <span className="flex items-center gap-2 text-[12px] font-medium text-muted">
                    {c._count.messages > 0 && <span className="size-2 rounded-full bg-coral" aria-label="Unread" />}
                    {listDateLabel(c.messages[0].createdAt, PRACTICE_TZ)}
                  </span>
                </span>
                <span className="truncate text-[13.5px] text-muted">{c.messages[0].body}</span>
              </Link>
            ))}
          </div>
          <div className="flex min-h-[500px] flex-col">
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <b>{active.patient.name}</b>
              <Link href={`/doctor/patients/${active.patientId}`} className="text-[13px] font-bold text-forest">
                Open record →
              </Link>
            </div>
            <Thread messages={thread} />
            <Composer action={doctorSend} conversationId={active.id} placeholder="Write a reply…" templates={templates} />
          </div>
        </div>
      )}
    </div>
  );
}
