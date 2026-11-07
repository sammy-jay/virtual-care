import "server-only";
import { cookies } from "next/headers";
import type { VisitType } from "@prisma/client";
import { db } from "@/lib/db";
import { getPractice } from "@/lib/care";
import { openSlots } from "@/lib/slots";
import { TIME_ZONES } from "@/lib/time";

/** Open slots for a visit type, from the doctor's windows minus time off and bookings. */
export async function loadOpenSlots(visitType: Pick<VisitType, "id" | "durationMin">, from: Date, days: number, ignoreAppointmentId?: string) {
  const practice = await getPractice();
  const until = new Date(from.getTime() + (days + 1) * 86400_000);
  const [windows, timeOff, booked] = await Promise.all([
    db.availabilityWindow.findMany(),
    db.timeOff.findMany({ where: { endAt: { gte: from }, startAt: { lte: until } } }),
    db.appointment.findMany({
      where: {
        status: { in: ["SCHEDULED", "PENDING_PAYMENT"] },
        startsAt: { gte: new Date(from.getTime() - 86400_000), lte: until },
        ...(ignoreAppointmentId ? { id: { not: ignoreAppointmentId } } : {}),
      },
      select: { startsAt: true, endsAt: true },
    }),
  ]);
  return openSlots({
    practiceTz: practice.timeZone,
    windows,
    timeOff: timeOff.map((t) => ({ startsAt: t.startAt, endsAt: t.endAt })),
    booked,
    visitTypeId: visitType.id,
    durationMin: visitType.durationMin,
    bufferMin: practice.bufferMinutes,
    noticeHours: practice.noticeHours,
    from,
    days,
  });
}

export const TZ_COOKIE = "vc_tz";

/** Visitor time zone for public pages: cookie set by <TimeZoneSync>, else Lagos. */
export async function visitorTimeZone() {
  const tz = (await cookies()).get(TZ_COOKIE)?.value;
  if (tz) {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: tz });
      return tz;
    } catch {}
  }
  return "Africa/Lagos";
}

export function zoneLongName(tz: string, at = new Date()) {
  if (tz === "Africa/Lagos") return "West Africa Time";
  const p = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "long" }).formatToParts(at);
  return p.find((x) => x.type === "timeZoneName")?.value ?? TIME_ZONES.find((z) => z.id === tz)?.label ?? tz;
}

/** Regions a patient can say they are in at booking. Licensure decides which are bookable. */
export const REGIONS = [
  { code: "NG", name: "Nigeria" },
  { code: "US-TX", name: "Texas, USA" },
  { code: "US-CA", name: "California, USA" },
  { code: "US-OTHER", name: "Elsewhere in the USA" },
  { code: "GH", name: "Ghana" },
  { code: "UK", name: "United Kingdom" },
  { code: "OTHER", name: "Somewhere else" },
];
