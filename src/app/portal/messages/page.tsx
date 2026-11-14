import Link from "next/link";
import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { Composer, Thread } from "@/components/messages";
import { Avatar, ButtonLink, Card, IconTile, PageTitle } from "@/components/ui";
import { requirePatient } from "@/lib/auth/dal";
import { getPlans, messagingAccess } from "@/lib/care";
import { db } from "@/lib/db";
import { cn, moneyShort } from "@/lib/format";
import { ensureDoctorConversation, loadThread, postMessage } from "@/lib/messaging";
import { fmtShort, listDateLabel } from "@/lib/time";

export const metadata: Metadata = { title: "Messages" };

async function send(form: FormData) {
  "use server";
  const user = await requirePatient();
  const access = await messagingAccess(user.id);
  if (!access.open) return;
  const c = await db.conversation.findFirst({ where: { id: String(form.get("conversationId")), patientId: user.id, kind: "doctor" } });
  if (!c) return;
  await postMessage({ conversationId: c.id, senderId: user.id, fromDoctor: false, body: String(form.get("body") ?? "") });
  revalidatePath("/portal/messages");
}

export default async function PatientMessagesPage({ searchParams }: PageProps<"/portal/messages">) {
  const user = await requirePatient();
  const sp = await searchParams;
  const access = await messagingAccess(user.id);

  if (!access.open) {
    const plans = await getPlans();
    const cheapest = plans[0];
    return (
      <div className="mx-auto max-w-[900px]">
        <Card className="text-center">
          <div className="flex justify-center">
            <IconTile icon="lock" tone="gold" size={64} />
          </div>
          <h1 className="h-display mt-4 text-[34px]">Messaging is a member benefit</h1>
          <p className="mx-auto mt-2 max-w-[520px] text-[15.5px] text-body">Members message Dr. Oparaji between visits. If you pay per visit, you can message for 14 days after each visit.</p>
        </Card>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <Card>
            <b className="font-display text-2xl font-normal">Book a visit</b>
            <p className="mt-1 text-sm text-body">Start with a free 15-minute intro call. Messaging opens for 14 days after.</p>
            <ButtonLink href="/portal/book?type=intro" variant="secondary" className="mt-4">
              Book intro call
            </ButtonLink>
          </Card>
          <Card className="!border-forest">
            <b className="font-display text-2xl font-normal">Join a plan</b>
            <p className="mt-1 text-sm text-body">From {cheapest ? moneyShort(cheapest.monthlyPriceCents) : "$59"}/mo with secure messaging all month. Thrive adds an included follow-up.</p>
            <ButtonLink href="/membership" className="mt-4">
              View membership
            </ButtonLink>
          </Card>
        </div>
      </div>
    );
  }

  const main = await ensureDoctorConversation(user.id);
  const convos = await db.conversation.findMany({
    where: { patientId: user.id },
    orderBy: [{ kind: "asc" }, { lastMessageAt: "desc" }],
    include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  convos.sort((a, b) => Number(b.kind === "doctor") - Number(a.kind === "doctor")); // Dr. Oparaji's thread first
  const active = convos.find((c) => c.id === sp.c) ?? convos.find((c) => c.id === main.id)!;
  const thread = await loadThread(active.id, false, user.timeZone);

  const accessNote =
    access.reason === "member" ? `Messaging is included with your ${access.plan} plan.` : `Messaging is open until ${fmtShort(access.until, user.timeZone)}, 14 days after your visit.`;
  const isDoctor = active.kind === "doctor";

  return (
    <div className="mx-auto max-w-[1140px]">
      <PageTitle title="Messages" subtitle="Private between you and Dr. Oparaji." />

      {/* Phones: conversations as a switcher above the thread. */}
      <nav aria-label="Conversations" className="-mt-1 mb-3 flex gap-2 overflow-x-auto pb-1 md:hidden">
        {convos.map((c) => (
          <Link
            key={c.id}
            href={`/portal/messages?c=${c.id}`}
            aria-current={c.id === active.id ? "page" : undefined}
            className={cn("flex-none rounded-full border px-4 py-2 text-[14px] font-bold", c.id === active.id ? "border-forest bg-forest text-white" : "border-line bg-white text-body")}
          >
            {c.title}
          </Link>
        ))}
      </nav>

      <div className="grid h-[calc(100dvh-300px)] min-h-[420px] grid-cols-1 overflow-hidden rounded-[20px] border border-line bg-white md:h-[calc(100dvh-230px)] md:min-h-[520px] md:grid-cols-[280px_minmax(0,1fr)] lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="hidden min-h-0 flex-col border-r border-line md:flex">
          <div className="min-h-0 flex-1 overflow-y-auto">
            {convos.map((c) => (
              <Link
                key={c.id}
                href={`/portal/messages?c=${c.id}`}
                aria-current={c.id === active.id ? "page" : undefined}
                className={cn("flex items-center gap-3 border-b border-line-soft px-4 py-4 hover:bg-canvas", c.id === active.id && "bg-sage hover:bg-sage")}
              >
                <Avatar initials={c.kind === "doctor" ? "NO" : "CT"} tone={c.kind === "doctor" ? "forest" : "gold"} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <b className="truncate text-[15px]">{c.title}</b>
                    <span className="flex-none text-[12px] text-muted">{c.messages[0] ? listDateLabel(c.messages[0].createdAt, user.timeZone) : ""}</span>
                  </span>
                  <span className="block truncate text-[13.5px] text-muted">{c.messages[0]?.body ?? "No messages yet"}</span>
                </span>
              </Link>
            ))}
          </div>
          <p className="flex-none border-t border-line-soft p-4 text-[13px] text-muted">{accessNote}</p>
        </div>

        <div className="flex min-h-0 min-w-0 flex-col">
          <div className="flex flex-none items-center gap-3 border-b border-line px-4 py-3 sm:px-5">
            <Avatar initials={isDoctor ? "NO" : "CT"} tone={isDoctor ? "forest" : "gold"} />
            <div className="min-w-0 flex-1 leading-tight">
              <b className="block truncate text-[15.5px]">{active.title}</b>
              <span className="block truncate text-[13px] text-muted">{isDoctor ? "Typical reply within 1 business day" : "Reminders from the practice"}</span>
            </div>
          </div>
          <Thread messages={thread} />
          {isDoctor ? (
            <Composer action={send} conversationId={active.id} note="Not for emergencies. Call 911 (US) or 112 (Nigeria)." />
          ) : (
            <p className="flex-none border-t border-line p-4 text-[13px] text-muted">The care team sends reminders here. Reply to Dr. Oparaji in her thread.</p>
          )}
        </div>
      </div>
      <p className="mt-3 text-[13px] text-muted md:hidden">{accessNote}</p>
    </div>
  );
}
