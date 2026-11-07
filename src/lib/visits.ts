import "server-only";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { shortName } from "@/lib/format";
import { notify, notifyDoctors } from "@/lib/notify";
import { fmtWhen, PRACTICE_TZ } from "@/lib/time";

/** Side effects once a visit is confirmed (free, included, or paid). */
export async function confirmBooked(appointmentId: string) {
  const a = await db.appointment.findUniqueOrThrow({ where: { id: appointmentId }, include: { patient: true, visitType: true } });
  if (!a.patient) return;
  const when = fmtWhen(a.startsAt, a.patient.timeZone);
  await sendEmail(a.patient.email, { template: "booking_confirmed", when });
  await notify(a.patient.id, { category: "VISITS", title: "Booking confirmed", body: `${a.visitType.name} with Dr. Oparaji · ${when}`, href: "/portal/visits" });
  const docWhen = fmtWhen(a.startsAt, PRACTICE_TZ);
  await notifyDoctors({ category: "VISITS", title: "Booking confirmed", body: `${shortName(a.patient.name)} · ${a.visitType.name} · ${docWhen}`, href: `/doctor/appointments?id=${a.id}` });
  const doctors = await db.user.findMany({ where: { role: "DOCTOR" } });
  for (const d of doctors) await sendEmail(d.email, { template: "doctor_new_booking", patient: shortName(a.patient.name), type: a.visitType.name, when: docWhen, id: a.id });
}
