import "server-only";
import { cookies } from "next/headers";
import type { VisitType } from "@prisma/client";
import { db } from "@/lib/db";
import { getPractice } from "@/lib/care";
import { openSlots } from "@/lib/slots";
import { TIME_ZONES } from "@/lib/time";
import { MARKETS } from "@/lib/market";
import { getMarket } from "@/lib/market-server";
import { MARKET_REGIONS } from "@/lib/regions";

/** An unpaid booking holds its slot for this long. */
export const HOLD_MINUTES = 30;

/**
 * Cancel unpaid bookings older than HOLD_MINUTES. Runs whenever slots are read or a payment starts,
 * so holds expire on time even though the cron job only runs daily. Idempotent and cheap.
 */
export async function releaseExpiredHolds(now = new Date()) {
  const r = await db.appointment.updateMany({
    where: { status: "PENDING_PAYMENT", createdAt: { lt: new Date(now.getTime() - HOLD_MINUTES * 60_000) } },
    data: { status: "CANCELED", canceledAt: now },
  });
  return r.count;
}

/** Open slots for a visit type, from the doctor's windows minus time off and bookings. */
export async function loadOpenSlots(visitType: Pick<VisitType, "id" | "durationMin">, from: Date, days: number, ignoreAppointmentId?: string) {
  await releaseExpiredHolds();
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

/** Visitor time zone for public pages: cookie set by <TimeZoneSync>, else the site default (Lagos / New York). */
export async function visitorTimeZone() {
  const tz = (await cookies()).get(TZ_COOKIE)?.value;
  if (tz) {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: tz });
      return tz;
    } catch {}
  }
  return MARKETS[await getMarket()].defaultTimeZone;
}

export function zoneLongName(tz: string, at = new Date()) {
  if (tz === "Africa/Lagos") return "West Africa Time";
  const p = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "long" }).formatToParts(at);
  return p.find((x) => x.type === "timeZoneName")?.value ?? TIME_ZONES.find((z) => z.id === tz)?.label ?? tz;
}

/** Regions a patient can say they are in at booking on this site. Licensure decides which are bookable. */
export async function bookingRegions() {
  return MARKET_REGIONS[await getMarket()];
}
