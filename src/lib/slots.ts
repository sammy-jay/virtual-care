import { addDays } from "date-fns";
import { dayKey, weekdayIn, zonedWallToUtc } from "./time";

export interface Window {
  weekday: number;
  startMin: number;
  endMin: number;
  visitTypeIds: string[];
}
export interface Busy {
  startsAt: Date;
  endsAt: Date;
}

export interface SlotInput {
  practiceTz: string;
  windows: Window[];
  timeOff: Busy[];
  booked: Busy[];
  visitTypeId: string;
  durationMin: number;
  bufferMin: number;
  noticeHours: number;
  from: Date;
  days: number;
  stepMin?: number;
  now?: Date;
}

const overlaps = (a0: number, a1: number, b0: number, b1: number) => a0 < b1 && b0 < a1;

/** Open start times (UTC), grouped by practice-zone day key. Bookable rules: board 10.3. */
export function openSlots(input: SlotInput): Date[] {
  const {
    practiceTz,
    windows,
    timeOff,
    booked,
    visitTypeId,
    durationMin,
    bufferMin,
    noticeHours,
    from,
    days,
    stepMin = 30,
    now = new Date(),
  } = input;
  const earliest = now.getTime() + noticeHours * 3600_000;
  const out: Date[] = [];
  const seen = new Set<number>();

  for (let i = 0; i < days; i++) {
    const day = addDays(from, i);
    const key = dayKey(day, practiceTz);
    const weekday = weekdayIn(zonedWallToUtc(key, 12 * 60, practiceTz), practiceTz);
    for (const w of windows) {
      if (w.weekday !== weekday) continue;
      if (w.visitTypeIds.length && !w.visitTypeIds.includes(visitTypeId)) continue;
      for (let m = w.startMin; m + durationMin <= w.endMin; m += stepMin) {
        const start = zonedWallToUtc(key, m, practiceTz);
        const s = start.getTime();
        const e = s + durationMin * 60_000;
        if (s < earliest || seen.has(s)) continue;
        if (timeOff.some((t) => overlaps(s, e, t.startsAt.getTime(), t.endsAt.getTime()))) continue;
        const pad = bufferMin * 60_000;
        if (booked.some((b) => overlaps(s - pad, e + pad, b.startsAt.getTime(), b.endsAt.getTime()))) continue;
        seen.add(s);
        out.push(start);
      }
    }
  }
  return out.sort((a, b) => a.getTime() - b.getTime());
}
