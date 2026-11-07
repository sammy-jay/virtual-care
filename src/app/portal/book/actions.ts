"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requirePatient } from "@/lib/auth/dal";
import { loadOpenSlots, REGIONS } from "@/lib/booking";
import { getPractice, hasPriorVisit, quoteVisit } from "@/lib/care";
import { confirmBooked } from "@/lib/visits";

export type BookState = {
  errors?: Partial<Record<"visitType" | "slot" | "reason" | "region" | "consent", string>>;
  unlicensed?: string;
  reconfirm?: boolean;
  message?: string;
};

export async function bookVisit(_: BookState, form: FormData): Promise<BookState> {
  const user = await requirePatient();
  const practice = await getPractice();
  const visitTypeId = String(form.get("visitTypeId") ?? "");
  const slot = String(form.get("slot") ?? "");
  const reason = String(form.get("reason") ?? "").trim();
  const region = String(form.get("region") ?? "");
  const consent = form.get("consent") === "on";
  const reconfirmed = form.get("reconfirmed") === "1";

  const errors: BookState["errors"] = {};
  const vt = visitTypeId ? await db.visitType.findFirst({ where: { id: visitTypeId, active: true } }) : null;
  if (!vt) errors.visitType = "Choose a visit.";
  const startsAt = slot ? new Date(slot) : null;
  if (!startsAt || Number.isNaN(startsAt.getTime())) errors.slot = "Choose a time.";
  if (reason.length < 3) errors.reason = "Tell us briefly why you are booking.";
  if (!REGIONS.some((r) => r.code === region)) errors.region = "Confirm your location.";
  if (!consent) errors.consent = "Required.";
  if (Object.keys(errors).length) return { errors, message: `Fix ${Object.keys(errors).length} thing${Object.keys(errors).length === 1 ? "" : "s"} to continue.` };

  if (!practice.bookingPublished) return { message: "Booking is not open yet. Please check back soon." };

  // Licensure (04.8)
  const license = await db.license.findUnique({ where: { regionCode: region } });
  if (!license || license.status !== "ACTIVE") {
    return { unlicensed: REGIONS.find((r) => r.code === region)?.name ?? region };
  }

  // Consent reconfirm when the location differs from the profile (04.7)
  const profile = await db.patientProfile.findUnique({ where: { userId: user.id } });
  if (!reconfirmed && profile?.region && profile.region !== region) return { reconfirm: true };

  // Eligibility
  if (vt!.alwaysFree) {
    const had = await db.appointment.count({ where: { patientId: user.id, visitTypeId: vt!.id, status: { in: ["SCHEDULED", "COMPLETED"] } } });
    if (had) return { errors: { visitType: "You have already booked your free intro call." }, message: "Fix 1 thing to continue." };
  }
  if (vt!.requiresPriorVisit && !(await hasPriorVisit(user.id))) {
    return { errors: { visitType: "Follow-ups are available after your first visit." }, message: "Fix 1 thing to continue." };
  }

  // Slot must still be open
  const dayStart = new Date(startsAt!.getTime() - 86400_000);
  const open = await loadOpenSlots(vt!, dayStart, 3);
  if (!open.some((s) => s.getTime() === startsAt!.getTime())) {
    return { errors: { slot: "That time was just taken. Pick another." }, message: "Fix 1 thing to continue." };
  }

  const quote = await quoteVisit(user.id, vt!, startsAt!);
  const appt = await db.appointment.create({
    data: {
      patientId: user.id,
      visitTypeId: vt!.id,
      startsAt: startsAt!,
      endsAt: new Date(startsAt!.getTime() + vt!.durationMin * 60_000),
      status: quote.needsPayment ? "PENDING_PAYMENT" : "SCHEDULED",
      reason,
      region,
      consentAt: new Date(),
      patientTimeZone: user.timeZone,
      priceCents: quote.amountCents,
      standardCents: quote.standardCents,
      pricingReason: quote.reason,
      usesAllowance: quote.usesAllowance,
      membershipId: quote.membership?.id ?? null,
      roomName: `room-${crypto.randomUUID().slice(0, 12)}`,
      backupUrl: `${process.env.APP_URL ?? "http://localhost:3000"}/room/backup`,
    },
  });
  if (profile && profile.region !== region) await db.patientProfile.update({ where: { id: profile.id }, data: { region } });

  if (quote.needsPayment) redirect(`/portal/visits/${appt.id}/pay`);

  await confirmBooked(appt.id);
  redirect(`/portal/visits/${appt.id}/confirmed`);
}
