import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

export const PRACTICE_TZ = "America/Chicago";

/** Supported patient time zones, shown in the sign-up and settings pickers. */
export const TIME_ZONES: { id: string; label: string; city: string }[] = [
  { id: "Africa/Lagos", label: "Africa/Lagos (WAT)", city: "Lagos" },
  { id: "America/Chicago", label: "America/Chicago (Central)", city: "Houston" },
  { id: "America/New_York", label: "America/New_York (Eastern)", city: "New York" },
  { id: "America/Denver", label: "America/Denver (Mountain)", city: "Denver" },
  { id: "America/Los_Angeles", label: "America/Los_Angeles (Pacific)", city: "Los Angeles" },
  { id: "Europe/London", label: "Europe/London (UK)", city: "London" },
  { id: "Africa/Accra", label: "Africa/Accra (GMT)", city: "Accra" },
];

const CITY: Record<string, string> = Object.fromEntries(TIME_ZONES.map((z) => [z.id, z.city]));

/** "WAT", "CDT", "CST", "EDT"… */
export function zoneAbbr(tz: string, at: Date = new Date()): string {
  if (tz === "Africa/Lagos") return "WAT";
  if (tz === "Africa/Accra") return "GMT";
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" }).formatToParts(at);
  return parts.find((p) => p.type === "timeZoneName")?.value ?? tz;
}

export function zoneCity(tz: string): string {
  return CITY[tz] ?? tz.split("/").pop()!.replace(/_/g, " ");
}

/** "WAT · Lagos" */
export function zoneChip(tz: string, at?: Date) {
  return `${zoneAbbr(tz, at)} · ${zoneCity(tz)}`;
}

export function utcOffsetLabel(tz: string, at: Date = new Date()) {
  const off = formatInTimeZone(at, tz, "xxx"); // +01:00
  const [h, m] = off.slice(1).split(":");
  return `UTC${off[0]}${Number(h)}${m !== "00" ? ":" + m : ""}`;
}

export const fmt = (d: Date, tz: string, pattern: string) => formatInTimeZone(d, tz, pattern);

/** "7:00 PM" */
export const fmtTime = (d: Date, tz: string) => formatInTimeZone(d, tz, "h:mm a");
/** "Thu 29 Oct" */
export const fmtDay = (d: Date, tz: string) => formatInTimeZone(d, tz, "EEE d MMM");
/** "29 Oct" */
export const fmtShort = (d: Date, tz: string) => formatInTimeZone(d, tz, "d MMM");
/** "Thu 29 Oct · 7:00 PM WAT" */
export const fmtWhen = (d: Date, tz: string) => `${fmtDay(d, tz)} · ${fmtTime(d, tz)} ${zoneAbbr(tz, d)}`;

/** Wall-clock time in `tz` → UTC Date. `date` is "yyyy-MM-dd". */
export function zonedWallToUtc(date: string, minutes: number, tz: string): Date {
  if (minutes >= 1440 || minutes < 0) {
    // Roll whole days into the date so "24:00" means midnight of the next day.
    const days = Math.floor(minutes / 1440);
    const [y, mo, d] = date.split("-").map(Number);
    const next = new Date(Date.UTC(y, mo - 1, d + days)).toISOString().slice(0, 10);
    return zonedWallToUtc(next, minutes - days * 1440, tz);
  }
  const h = String(Math.floor(minutes / 60)).padStart(2, "0");
  const m = String(minutes % 60).padStart(2, "0");
  return fromZonedTime(`${date}T${h}:${m}:00`, tz);
}

/** yyyy-MM-dd of `d` in `tz` */
export const dayKey = (d: Date, tz: string) => formatInTimeZone(d, tz, "yyyy-MM-dd");

export function weekdayIn(d: Date, tz: string) {
  return toZonedTime(d, tz).getDay();
}

/** "Good morning" / "Good afternoon" / "Good evening" in the viewer's zone. */
export function greeting(tz: string, now = new Date()) {
  const h = Number(formatInTimeZone(now, tz, "H"));
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/** Relative label used in notification lists: "2 h ago", "Yesterday", "Mon". */
export function relativeLabel(d: Date, tz: string, now = new Date()) {
  const mins = Math.round((now.getTime() - d.getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24 && dayKey(d, tz) === dayKey(now, tz)) return `${hours} h ago`;
  const yesterday = new Date(now.getTime() - 86400000);
  if (dayKey(d, tz) === dayKey(yesterday, tz)) return "Yesterday";
  if (now.getTime() - d.getTime() < 6 * 86400000) return formatInTimeZone(d, tz, "EEE");
  return formatInTimeZone(d, tz, "d MMM");
}

/** Short label for message lists: today → "9:40 AM", this week → "Mon", else "30 Sep". */
export function listDateLabel(d: Date, tz: string, now = new Date()) {
  if (dayKey(d, tz) === dayKey(now, tz)) return fmtTime(d, tz);
  if (now.getTime() - d.getTime() < 6 * 86400000) return formatInTimeZone(d, tz, "EEE");
  return formatInTimeZone(d, tz, "d MMM");
}

export function addMonths(d: Date, n: number) {
  const r = new Date(d);
  r.setUTCMonth(r.getUTCMonth() + n);
  return r;
}

/** Like zonedWallToUtc but returns null for a malformed "yyyy-MM-dd". */
export function zoneWallToUtcSafe(date: string, minutes: number, tz: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const d = zonedWallToUtc(date, minutes, tz);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Current time for request-time (server) rendering. Wrapped so render code reads the clock in one place. */
export const nowMs = () => Date.now();
