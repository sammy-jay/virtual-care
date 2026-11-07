import Link from "next/link";
import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { Composer, Thread } from "@/components/messages";
import { ButtonLink, Card, IconTile, PageTitle } from "@/components/ui";
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
  const active = convos.find((c) => c.id === sp.c) ?? convos.find((c) => c.id === main.id)!;
  const thread = await loadThread(active.id, false, user.timeZone);

  return (
    <div className="mx-auto max-w-[1140px]">
      <PageTitle title="Messages" subtitle="Private between you and Dr. Oparaji." />
      <div className="grid overflow-hidden rounded-[20px] border border-line bg-white md:grid-cols-[300px_1fr]" style={{ minHeight: 560 }}>
        <div className="border-b border-line md:border-b-0 md:border-r">
          {convos.map((c) => (
            <Link key={c.id} href={`/portal/messages?c=${c.id}`} className={cn("flex flex-col border-b border-line-soft px-5 py-4", c.id === active.id && "bg-sage")}>
              <span className="flex justify-between text-[15px] font-bold">
                {c.title}
                <span className="text-[12px] font-medium text-muted">{c.messages[0] ? listDateLabel(c.messages[0].createdAt, user.timeZone) : ""}</span>
              </span>
              <span className="truncate text-[13.5px] text-muted">{c.messages[0]?.body ?? "No messages yet"}</span>
            </Link>
          ))}
          <p className="p-5 text-[13px] text-muted">
            {access.reason === "member" ? `Messaging is included with your ${access.plan} plan.` : `Messaging is open until ${fmtShort(access.until, user.timeZone)}, 14 days after your visit.`}
          </p>
        </div>
        <div className="flex min-h-[480px] flex-col">
          <Thread messages={thread} />
          {active.kind === "doctor" ? (
            <Composer action={send} conversationId={active.id} note="Not for emergencies. Typical reply within 1 business day." />
          ) : (
            <p className="border-t border-line p-4 text-[13px] text-muted">The care team sends reminders here. Reply to Dr. Oparaji in her thread.</p>
          )}
        </div>
      </div>
    </div>
  );
}
