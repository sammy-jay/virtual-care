import "server-only";
import { db } from "@/lib/db";
import { emailDoctors, sendEmail } from "@/lib/email";
import { shortName } from "@/lib/format";
import { notify, notifyDoctors } from "@/lib/notify";
import { fmtTime, listDateLabel } from "@/lib/time";
import type { ThreadMessage } from "@/components/messages";

export async function ensureDoctorConversation(patientId: string) {
  return (await db.conversation.findFirst({ where: { patientId, kind: "doctor" } })) ?? db.conversation.create({ data: { patientId, title: "Dr. Oparaji", kind: "doctor" } });
}

export async function loadThread(conversationId: string, viewerIsDoctor: boolean, tz: string): Promise<ThreadMessage[]> {
  const msgs = await db.message.findMany({ where: { conversationId }, orderBy: { createdAt: "asc" }, take: 200 });
  // Mark the other side's messages as read.
  await db.message.updateMany({ where: { conversationId, fromDoctor: !viewerIsDoctor, readAt: null }, data: { readAt: new Date() } });
  return msgs.map((m) => {
    const mine = m.fromDoctor === viewerIsDoctor;
    const who = m.fromDoctor ? (viewerIsDoctor ? "You" : "Dr. Oparaji") : viewerIsDoctor ? "" : "You";
    const day = listDateLabel(m.createdAt, tz);
    const when = day.includes(":") ? `Today ${day}` : `${day} ${fmtTime(m.createdAt, tz)}`;
    return {
      id: m.id,
      mine,
      body: m.body,
      kind: m.kind,
      meta: m.kind === "CARE_PLAN" ? "From your latest visit" : who ? `${who} · ${when}` : when,
      href: m.carePlanId ? (viewerIsDoctor ? undefined : `/portal/care-plans/${m.carePlanId}`) : undefined,
    };
  });
}

export async function postMessage(opts: { conversationId: string; senderId: string; fromDoctor: boolean; body: string }) {
  const body = opts.body.trim().slice(0, 4000);
  if (!body) return;
  const c = await db.conversation.findUniqueOrThrow({ where: { id: opts.conversationId }, include: { patient: true } });
  // Email only for the first unread message, so a burst of messages sends one email, not ten.
  const alreadyUnread = await db.message.count({ where: { conversationId: c.id, fromDoctor: opts.fromDoctor, readAt: null } });
  await db.message.create({ data: { conversationId: c.id, senderId: opts.senderId, fromDoctor: opts.fromDoctor, body } });
  await db.conversation.update({ where: { id: c.id }, data: { lastMessageAt: new Date() } });
  if (opts.fromDoctor) {
    if (!alreadyUnread && c.patient.notifyPrefs?.newMessages !== false) await sendEmail(c.patient.email, { template: "new_message" });
    await notify(c.patientId, { category: "MESSAGES", title: "New message", body: `Dr. Oparaji: “${body.slice(0, 60)}${body.length > 60 ? "…" : ""}”`, href: "/portal/messages" });
  } else {
    await notifyDoctors({ category: "MESSAGES", title: `New message from ${shortName(c.patient.name)}`, body: `“${body.slice(0, 40)}${body.length > 40 ? "…" : ""}”`, href: `/doctor/messages?c=${c.id}` });
    if (!alreadyUnread) await emailDoctors({ template: "doctor_new_message", patient: shortName(c.patient.name), conversationId: c.id });
  }
}
