"use server";

import { redirect } from "next/navigation";
import { requirePatient } from "@/lib/auth/dal";
import { getPractice } from "@/lib/care";
import { db } from "@/lib/db";
import { notifyDoctors } from "@/lib/notify";
import { shortName } from "@/lib/format";
import { roomWindow } from "@/lib/visit-labels";

export async function enterWaitingRoom(form: FormData) {
  const user = await requirePatient();
  const practice = await getPractice();
  const a = await db.appointment.findUnique({ where: { id: String(form.get("id")) }, include: { visitType: true } });
  if (!a || a.patientId !== user.id) redirect("/portal/visits");
  const w = roomWindow(a, practice.roomOpensMinBefore, practice.roomClosesMinAfter);
  if (!w.isOpen || a.status !== "SCHEDULED") redirect(`/portal/visits/${a.id}/precheck`);
  if (!a.waitingSince) {
    await db.appointment.update({ where: { id: a.id }, data: { waitingSince: new Date() } });
    await notifyDoctors({ category: "VISITS", title: `${shortName(user.name)} is in the waiting room`, body: a.visitType.name, href: `/doctor/visits/${a.id}/waiting` });
  }
  redirect(`/room/${a.id}${form.get("audio") === "1" ? "?audio=1" : ""}`);
}

export async function leaveVisit(form: FormData) {
  const user = await requirePatient();
  const a = await db.appointment.findUnique({ where: { id: String(form.get("id")) } });
  if (!a || a.patientId !== user.id) redirect("/portal/visits");
  redirect(`/portal/visits/${a.id}/ended`);
}

export async function sendFeedback(form: FormData) {
  const user = await requirePatient();
  const id = String(form.get("id"));
  const a = await db.appointment.findUnique({ where: { id } });
  if (!a || a.patientId !== user.id) redirect("/portal");
  const rating = Math.min(5, Math.max(1, Number(form.get("rating")) || 5));
  const comment = String(form.get("comment") ?? "").trim().slice(0, 2000) || null;
  await db.feedback.upsert({ where: { appointmentId: id }, create: { appointmentId: id, rating, comment }, update: { rating, comment } });
  redirect("/portal?thanks=1");
}
