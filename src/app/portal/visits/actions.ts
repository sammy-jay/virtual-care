"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requirePatient } from "@/lib/auth/dal";
import { refundPayment } from "@/lib/billing";
import { loadOpenSlots } from "@/lib/booking";
import { getPractice } from "@/lib/care";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { shortName } from "@/lib/format";
import { notifyDoctors } from "@/lib/notify";
import { fmtWhen, PRACTICE_TZ } from "@/lib/time";

async function ownAppointment(id: string) {
  const user = await requirePatient();
  const a = await db.appointment.findUnique({ where: { id }, include: { visitType: true } });
  if (!a || a.patientId !== user.id) redirect("/portal/visits");
  return { user, a };
}

/** 04.13 — free cancellation more than 12 h ahead; paid visits refund, included visits return. */
export async function cancelVisit(form: FormData) {
  const { user, a } = await ownAppointment(String(form.get("id")));
  const practice = await getPractice();
  if (a.status !== "SCHEDULED" && a.status !== "PENDING_PAYMENT") redirect(`/portal/visits?id=${a.id}`);
  if (a.status === "SCHEDULED" && a.startsAt.getTime() - Date.now() < practice.cancelHours * 3600_000) {
    redirect(`/portal/visits?id=${a.id}&dialog=blocked`);
  }
  await db.appointment.update({ where: { id: a.id }, data: { status: "CANCELED", canceledAt: new Date(), canceledBy: "PATIENT" } });
  const paid = await db.payment.findFirst({ where: { appointmentId: a.id, status: "PAID" } });
  if (paid) await refundPayment(paid.id, paid.amountCents, "Cancelled more than 12 hours before");
  const when = fmtWhen(a.startsAt, user.timeZone);
  await sendEmail(user.email, { template: "visit_cancelled", when });
  await notifyDoctors({
    category: "VISITS",
    title: "Visit cancelled",
    body: `${shortName(user.name)} cancelled ${fmtWhen(a.startsAt, PRACTICE_TZ)}${paid ? ` · refunded $${(paid.amountCents / 100).toFixed(2)}` : ""}`,
    href: "/doctor/appointments",
  });
  revalidatePath("/portal", "layout");
  redirect("/portal/visits?cancelled=1");
}

/** 04.15 — move to another open slot; included visit stays reserved. */
export async function rescheduleVisit(form: FormData) {
  const { user, a } = await ownAppointment(String(form.get("id")));
  const practice = await getPractice();
  const slot = new Date(String(form.get("slot") ?? ""));
  if (Number.isNaN(slot.getTime())) redirect(`/portal/visits?id=${a.id}&dialog=reschedule&error=slot`);
  if (a.startsAt.getTime() - Date.now() < practice.cancelHours * 3600_000) redirect(`/portal/visits?id=${a.id}&dialog=blocked`);
  const open = await loadOpenSlots(a.visitType, new Date(slot.getTime() - 86400_000), 3, a.id);
  if (!open.some((s) => s.getTime() === slot.getTime())) redirect(`/portal/visits?id=${a.id}&dialog=reschedule&error=taken`);
  await db.appointment.update({
    where: { id: a.id },
    data: { startsAt: slot, endsAt: new Date(slot.getTime() + a.visitType.durationMin * 60_000), reminder1Sent: false, reminder24Sent: false },
  });
  await sendEmail(user.email, { template: "visit_rescheduled", when: fmtWhen(slot, user.timeZone) });
  await notifyDoctors({ category: "VISITS", title: "Visit rescheduled", body: `${shortName(user.name)} · ${a.visitType.name} · ${fmtWhen(slot, PRACTICE_TZ)}`, href: "/doctor/appointments" });
  revalidatePath("/portal", "layout");
  redirect(`/portal/visits/${a.id}/confirmed`);
}
