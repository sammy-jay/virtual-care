"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAccess } from "@/lib/audit";
import { requireDoctor } from "@/lib/auth/dal";
import { refundPayment } from "@/lib/billing";
import { loadOpenSlots } from "@/lib/booking";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { money, shortName } from "@/lib/format";
import { postMessage } from "@/lib/messaging";
import { notify } from "@/lib/notify";
import { fmtWhen, PRACTICE_TZ, zoneWallToUtcSafe } from "@/lib/time";

const back = (form: FormData, fallback: string) => {
  const r = String(form.get("returnTo") ?? "");
  return r.startsWith("/doctor") ? r : fallback;
};
const cents = (v: FormDataEntryValue | null) => Math.round(Number(String(v ?? "").replace(/[^0-9.]/g, "")) * 100);

// ─── Visits ──────────────────────────────────────────────────────────────────

export async function admitPatient(form: FormData) {
  const doc = await requireDoctor();
  const id = String(form.get("id"));
  const a = await db.appointment.update({ where: { id }, data: { admittedAt: new Date() } });
  await logAccess(doc, "Started visit", a.patientId);
  redirect(`/doctor/visits/${id}/room`);
}

/** End the call: visit COMPLETED; doctor goes to notes. */
export async function endVisit(form: FormData) {
  await requireDoctor();
  const id = String(form.get("id"));
  const a = await db.appointment.findUniqueOrThrow({ where: { id } });
  if (a.status === "SCHEDULED") await db.appointment.update({ where: { id }, data: { status: "COMPLETED", endedAt: new Date(), admittedAt: a.admittedAt ?? new Date() } });
  revalidatePath("/doctor", "layout");
  redirect(`/doctor/visits/${id}/notes`);
}

export async function saveQuickNotes(form: FormData) {
  await requireDoctor();
  const id = String(form.get("id"));
  const quickNotes = String(form.get("quickNotes") ?? "");
  await db.visitNote.upsert({ where: { appointmentId: id }, create: { appointmentId: id, quickNotes }, update: { quickNotes } });
}

/** 10.8 — uses the included visit, emails the patient; undo within 24 h. */
export async function markNoShow(form: FormData) {
  const doc = await requireDoctor();
  const id = String(form.get("id"));
  const a = await db.appointment.update({ where: { id }, data: { status: "NO_SHOW", noShowAt: new Date() }, include: { patient: true } });
  if (a.patient) {
    const when = fmtWhen(a.startsAt, a.patient.timeZone);
    await sendEmail(a.patient.email, { template: "no_show", when });
    await notify(a.patient.id, { category: "VISITS", title: "Missed visit", body: `You did not join your visit on ${when}.`, href: "/portal/visits?tab=past" });
  }
  await logAccess(doc, `Marked no-show · ${a.patient?.name ?? "visit"}`, a.patientId);
  revalidatePath("/doctor", "layout");
  redirect(back(form, `/doctor/appointments?id=${id}&undo=1`));
}

export async function undoNoShow(form: FormData) {
  await requireDoctor();
  const id = String(form.get("id"));
  const a = await db.appointment.findUniqueOrThrow({ where: { id } });
  if (a.status === "NO_SHOW" && a.noShowAt && Date.now() - a.noShowAt.getTime() < 24 * 3600_000) {
    await db.appointment.update({ where: { id }, data: { status: "SCHEDULED", noShowAt: null } });
  }
  revalidatePath("/doctor", "layout");
  redirect(`/doctor/appointments?id=${id}`);
}

/** 10.7 — doctor reschedules; patient emailed, included visit stays reserved, no charge. */
export async function doctorReschedule(form: FormData) {
  const doc = await requireDoctor();
  const id = String(form.get("id"));
  const slot = new Date(String(form.get("slot")));
  const a = await db.appointment.findUniqueOrThrow({ where: { id }, include: { visitType: true, patient: true } });
  const open = await loadOpenSlots(a.visitType, new Date(slot.getTime() - 86400_000), 3, a.id);
  if (Number.isNaN(slot.getTime()) || !open.some((s) => s.getTime() === slot.getTime())) redirect(`/doctor/appointments?id=${id}&dialog=reschedule&error=1`);
  await db.appointment.update({ where: { id }, data: { startsAt: slot, endsAt: new Date(slot.getTime() + a.visitType.durationMin * 60_000), reminder1Sent: false, reminder24Sent: false } });
  if (a.patient) {
    const when = fmtWhen(slot, a.patient.timeZone);
    await sendEmail(a.patient.email, { template: "visit_rescheduled", when });
    await notify(a.patient.id, { category: "VISITS", title: "Visit rescheduled", body: `Dr. Oparaji moved your ${a.visitType.name} to ${when}`, href: "/portal/visits" });
  }
  await logAccess(doc, `Rescheduled visit · ${a.patient?.name}`, a.patientId);
  revalidatePath("/doctor", "layout");
  redirect(`/doctor/appointments?id=${id}&moved=1`);
}

export async function saveVisitNotes(form: FormData) {
  const doc = await requireDoctor();
  const id = String(form.get("id"));
  const data = {
    subjective: String(form.get("subjective") ?? ""),
    objective: String(form.get("objective") ?? ""),
    assessment: String(form.get("assessment") ?? ""),
    plan: String(form.get("plan") ?? ""),
    followUpWeeks: Number(form.get("followUpWeeks")) || null,
  };
  const a = await db.appointment.findUniqueOrThrow({ where: { id } });
  await db.visitNote.upsert({ where: { appointmentId: id }, create: { appointmentId: id, ...data }, update: data });
  await logAccess(doc, "Saved visit notes", a.patientId);
  if (form.get("then") === "careplan") {
    const plan = await db.carePlan.upsert({ where: { appointmentId: id }, create: { appointmentId: id, patientId: a.patientId!, summary: data.assessment }, update: {} });
    redirect(`/doctor/care-plans/${plan.id}`);
  }
  redirect(`/doctor/visits/${id}/notes?saved=1`);
}

// ─── Care plans ──────────────────────────────────────────────────────────────

const lines = (v: FormDataEntryValue | null) =>
  String(v ?? "")
    .split(/\n|·/)
    .map((s) => s.trim())
    .filter(Boolean);

export async function startCarePlan(form: FormData) {
  await requireDoctor();
  const appointmentId = String(form.get("appointmentId"));
  const a = await db.appointment.findUniqueOrThrow({ where: { id: appointmentId } });
  const plan = await db.carePlan.upsert({ where: { appointmentId }, create: { appointmentId, patientId: a.patientId! }, update: {} });
  redirect(`/doctor/care-plans/${plan.id}`);
}

export async function saveCarePlan(form: FormData) {
  const doc = await requireDoctor();
  const id = String(form.get("id"));
  const plan = await db.carePlan.update({
    where: { id },
    data: { summary: String(form.get("summary") ?? ""), goals: lines(form.get("goals")), nutrition: lines(form.get("nutrition")), movement: lines(form.get("movement")), nextSteps: lines(form.get("nextSteps")) },
  });
  await logAccess(doc, "Edited care plan", plan.patientId);
  redirect(form.get("then") === "publish" ? `/doctor/care-plans/${id}?dialog=publish` : `/doctor/care-plans/${id}?saved=1`);
}

/** 10.10 — patient sees it only after publish, and gets an email. */
export async function publishCarePlan(form: FormData) {
  const doc = await requireDoctor();
  const id = String(form.get("id"));
  const plan = await db.carePlan.update({ where: { id }, data: { status: "PUBLISHED", publishedAt: new Date() }, include: { patient: true, appointment: { include: { visitType: true } } } });
  const convo = (await db.conversation.findFirst({ where: { patientId: plan.patientId, kind: "doctor" } })) ?? (await db.conversation.create({ data: { patientId: plan.patientId } }));
  await db.message.create({ data: { conversationId: convo.id, fromDoctor: true, senderId: doc.id, kind: "CARE_PLAN", body: "Your care plan was updated", carePlanId: plan.id } });
  if (plan.patient.notifyPrefs?.carePlans !== false) await sendEmail(plan.patient.email, { template: "care_plan_published" });
  await notify(plan.patientId, { category: "CARE_PLANS", title: "Care plan published", body: plan.appointment.visitType.name, href: `/portal/care-plans/${plan.id}` });
  await logAccess(doc, `Published care plan · ${shortName(plan.patient.name)}`, plan.patientId);
  revalidatePath("/doctor", "layout");
  redirect("/doctor?published=1");
}

// ─── Messages & templates & inquiries ────────────────────────────────────────

export async function doctorSend(form: FormData) {
  const doc = await requireDoctor();
  const c = await db.conversation.findUniqueOrThrow({ where: { id: String(form.get("conversationId")) } });
  await postMessage({ conversationId: c.id, senderId: doc.id, fromDoctor: true, body: String(form.get("body") ?? "") });
  revalidatePath("/doctor", "layout");
}

export async function saveTemplate(form: FormData) {
  await requireDoctor();
  const id = String(form.get("id") ?? "");
  const data = { title: String(form.get("title") ?? "").trim().slice(0, 60), body: String(form.get("body") ?? "").trim().slice(0, 2000) };
  if (!data.title || !data.body) redirect(`/doctor/messages/templates?dialog=${id || "new"}&error=1`);
  if (id) await db.messageTemplate.update({ where: { id }, data });
  else await db.messageTemplate.create({ data: { ...data, sortOrder: await db.messageTemplate.count() } });
  redirect("/doctor/messages/templates");
}

export async function deleteTemplate(form: FormData) {
  await requireDoctor();
  await db.messageTemplate.delete({ where: { id: String(form.get("id")) } });
  redirect("/doctor/messages/templates");
}

export async function replyInquiry(form: FormData) {
  await requireDoctor();
  const id = String(form.get("id"));
  const body = String(form.get("body") ?? "").trim();
  if (!body) redirect(`/doctor/inquiries/${id}?error=1`);
  const q = await db.inquiry.update({ where: { id }, data: { status: "REPLIED", replies: { push: { body, sentAt: new Date() } } } });
  await sendEmail(q.email, { template: "inquiry_reply", body });
  redirect(`/doctor/inquiries/${id}?sent=1`);
}

export async function closeInquiry(form: FormData) {
  await requireDoctor();
  await db.inquiry.update({ where: { id: String(form.get("id")) }, data: { status: "CLOSED" } });
  redirect("/doctor/inquiries");
}

// ─── Money ───────────────────────────────────────────────────────────────────

export async function issueRefund(form: FormData) {
  const doc = await requireDoctor();
  const id = String(form.get("paymentId"));
  const p = await db.payment.findUniqueOrThrow({ where: { id } });
  const full = form.get("kind") !== "partial";
  const amount = full ? p.amountCents - p.refundedCents : cents(form.get("amount"));
  const reason = String(form.get("reason") ?? "").trim() || "Refund from Dr. Oparaji";
  if (!full && !(amount > 0)) redirect(`${back(form, "/doctor/earnings")}?refund=${id}&error=amount`);
  await refundPayment(id, amount, reason);
  await logAccess(doc, `Refunded ${money(amount, p.currency)}`, p.patientId);
  revalidatePath("/doctor", "layout");
  redirect(`${back(form, "/doctor/earnings")}?refunded=1`);
}

// ─── Availability (10.3–10.6) ────────────────────────────────────────────────

const toMin = (v: FormDataEntryValue | null) => {
  const [h, m] = String(v ?? "").split(":").map(Number);
  return h * 60 + (m || 0);
};

export async function addWindow(form: FormData) {
  await requireDoctor();
  const weekday = Number(form.get("weekday"));
  const startMin = toMin(form.get("from"));
  const endMin = toMin(form.get("to"));
  if (!(endMin > startMin)) redirect("/doctor/availability?dialog=window&error=1");
  const visitTypeIds = form.getAll("visitTypeIds").map(String).filter((v) => v !== "all");
  await db.availabilityWindow.create({ data: { weekday, startMin, endMin, visitTypeIds } });
  redirect("/doctor/availability");
}

export async function removeWindow(form: FormData) {
  await requireDoctor();
  await db.availabilityWindow.delete({ where: { id: String(form.get("id")) } });
  redirect("/doctor/availability");
}

export async function copyDay(form: FormData) {
  await requireDoctor();
  const from = Number(form.get("from"));
  const targets = form.getAll("to").map(Number).filter((d) => d !== from);
  const src = await db.availabilityWindow.findMany({ where: { weekday: from } });
  await db.availabilityWindow.deleteMany({ where: { weekday: { in: targets } } });
  for (const d of targets) for (const w of src) await db.availabilityWindow.create({ data: { weekday: d, startMin: w.startMin, endMin: w.endMin, visitTypeIds: w.visitTypeIds } });
  redirect("/doctor/availability");
}

export async function addTimeOff(form: FormData) {
  await requireDoctor();
  const start = zoneWallToUtcSafe(String(form.get("from")), 0, PRACTICE_TZ);
  const end = zoneWallToUtcSafe(String(form.get("to")), 24 * 60, PRACTICE_TZ);
  if (!start || !end || end <= start) redirect("/doctor/availability?dialog=timeoff&error=1");
  await db.timeOff.create({ data: { startAt: start, endAt: end, note: String(form.get("note") ?? "") || null } });
  redirect("/doctor/availability");
}

export async function removeTimeOff(form: FormData) {
  await requireDoctor();
  await db.timeOff.delete({ where: { id: String(form.get("id")) } });
  redirect("/doctor/availability");
}

export async function saveBookingRules(form: FormData) {
  await requireDoctor();
  const p = await db.practice.findFirstOrThrow();
  await db.practice.update({
    where: { id: p.id },
    data: { noticeHours: Number(form.get("noticeHours")) || 12, bufferMinutes: Number(form.get("bufferMinutes")) || 0, cancelHours: Number(form.get("cancelHours")) || 12 },
  });
  redirect("/doctor/availability?saved=1");
}

// ─── Settings: visit types, plans, licensure, practice (10.11–10.14, 09.17, 09.22) ─

export async function saveVisitType(form: FormData) {
  await requireDoctor();
  const id = String(form.get("id") ?? "");
  const name = String(form.get("name") ?? "").trim();
  const durationMin = Number(form.get("durationMin"));
  const priceCents = cents(form.get("price"));
  const member = String(form.get("memberPrice") ?? "").trim();
  if (!name || !(durationMin >= 10) || priceCents < 0 || Number.isNaN(priceCents)) redirect(`/doctor/settings?dialog=${id ? `type-${id}` : "type-new"}&error=1`);
  const data = { name, durationMin, priceCents, memberPriceCents: member ? cents(member) : null, description: String(form.get("description") ?? "") || null, alwaysFree: priceCents === 0 };
  if (id) await db.visitType.update({ where: { id }, data });
  else await db.visitType.create({ data: { ...data, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now().toString(36).slice(-4), sortOrder: await db.visitType.count() } });
  redirect("/doctor/settings?saved=1");
}

export async function savePlan(form: FormData) {
  await requireDoctor();
  const id = String(form.get("id") ?? "");
  const name = String(form.get("name") ?? "").trim();
  const monthlyPriceCents = cents(form.get("price"));
  const discountPct = Number(form.get("discountPct"));
  const includedVisits = Number(form.get("includedVisits")) || 0;
  const includedVisitTypeIds = form.getAll("includedVisitTypeIds").map(String);
  if (!name || !(monthlyPriceCents > 0) || !(discountPct >= 0 && discountPct <= 100)) redirect(`/doctor/settings?dialog=${id ? `plan-${id}` : "plan-new"}&error=1`);
  const ngn = Number(String(form.get("priceNgn") ?? "").replace(/\D/g, "")) || Math.round((monthlyPriceCents / 100) * 1500);
  const includedLabel = String(form.get("includedLabel") ?? "").trim() || (includedVisits ? `${includedVisits} visit${includedVisits > 1 ? "s" : ""}` : "None");
  const data = { name, monthlyPriceCents, monthlyPriceNgn: ngn, discountPct, includedVisits, includedVisitTypeIds, includedLabel };
  if (id) await db.plan.update({ where: { id }, data });
  else
    await db.plan.create({
      data: { ...data, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), tagline: "", features: ["Secure messaging with Dr. Oparaji", `${discountPct}% off every visit`], sortOrder: await db.plan.count() },
    });
  redirect("/doctor/settings?saved=1");
}

export async function saveLicense(form: FormData) {
  await requireDoctor();
  const id = String(form.get("id") ?? "");
  const data = {
    regionCode: String(form.get("regionCode")),
    regionName: String(form.get("regionName") ?? "").trim(),
    credential: String(form.get("credential") ?? "") || null,
    numberMask: String(form.get("numberMask") ?? "") || null,
    renewsAt: form.get("renewsAt") ? new Date(String(form.get("renewsAt"))) : null,
    status: form.get("status") === "BLOCKED" ? ("BLOCKED" as const) : ("ACTIVE" as const),
  };
  if (id) await db.license.update({ where: { id }, data });
  else await db.license.upsert({ where: { regionCode: data.regionCode }, create: data, update: data });
  redirect("/doctor/settings/licensure");
}

export async function setBookingPublished(form: FormData) {
  await requireDoctor();
  const p = await db.practice.findFirstOrThrow();
  await db.practice.update({ where: { id: p.id }, data: { bookingPublished: form.get("on") === "1" } });
  revalidatePath("/doctor", "layout");
  redirect(back(form, "/doctor/setup"));
}

export async function savePayout(form: FormData) {
  await requireDoctor();
  const p = await db.practice.findFirstOrThrow();
  const acct = String(form.get("account") ?? "").replace(/\D/g, "");
  if (acct.length < 4) redirect("/doctor/earnings?dialog=payout&error=1");
  await db.practice.update({ where: { id: p.id }, data: { payoutBank: String(form.get("bank") ?? "Bank"), payoutLast4: acct.slice(-4), payoutSchedule: String(form.get("schedule") ?? "Weekly") } });
  redirect("/doctor/earnings");
}

// ─── Compliance ──────────────────────────────────────────────────────────────

export async function completeDataRequest(form: FormData) {
  const doc = await requireDoctor();
  const r = await db.dataRequest.update({ where: { id: String(form.get("id")) }, data: { status: "COMPLETED", completedAt: new Date() }, include: { patient: true } });
  await logAccess(doc, `Exported data · ${r.patient.name}`, r.patientId);
  await notify(r.patientId, { category: "BILLING", title: "Your data export is ready", body: "Download it from Data and privacy.", href: `/api/export/${r.id}` });
  redirect("/doctor/settings/data-requests?done=1");
}

export async function declineDataRequest(form: FormData) {
  await requireDoctor();
  const reason = String(form.get("reason") ?? "").trim();
  if (!reason) redirect(`/doctor/settings/data-requests?dialog=decline&id=${form.get("id")}&error=1`);
  await db.dataRequest.update({ where: { id: String(form.get("id")) }, data: { status: "DECLINED", declineReason: reason } });
  redirect("/doctor/settings/data-requests");
}

export async function markAllDoctorNotificationsRead() {
  const doc = await requireDoctor();
  await db.notification.updateMany({ where: { userId: doc.id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/doctor", "layout");
}
