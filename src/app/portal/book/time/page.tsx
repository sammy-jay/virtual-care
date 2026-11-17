import Link from "@/components/market";
import type { Metadata } from "next";
import { Card } from "@/components/ui";
import { requirePatient } from "@/lib/auth/dal";
import { loadOpenSlots } from "@/lib/booking";
import { getVisitTypes } from "@/lib/care";
import { cn } from "@/lib/format";
import { dayKey, fmt, fmtTime, PRACTICE_TZ, zoneAbbr, zoneCity, nowMs } from "@/lib/time";

export const metadata: Metadata = { title: "Time zones" };

/** 04.4 — the patient's clock next to the doctor's, plus DST warnings. */
export default async function TimeZonesPage({ searchParams }: PageProps<"/portal/book/time">) {
  const user = await requirePatient();
  const sp = await searchParams;
  const tz = user.timeZone;
  const types = await getVisitTypes();
  const vt = types.find((t) => t.slug === sp.type) ?? types.find((t) => t.slug === "follow-up") ?? types[0];
  const slots = await loadOpenSlots(vt, new Date(), 21);
  const day = typeof sp.day === "string" ? sp.day : slots[0] ? dayKey(slots[0], tz) : undefined;
  const daySlots = slots.filter((s) => dayKey(s, tz) === day);
  const selected = daySlots.find((s) => s.toISOString() === sp.slot) ?? daySlots[0];

  // DST change in the next 21 days in either zone?
  const offset = (z: string, d: Date) => Number(fmt(d, z, "x"));
  let dst: Date | null = null;
  for (let i = 1; i <= 21 && !dst; i++) {
    const a = new Date(nowMs() + (i - 1) * 86400_000);
    const b = new Date(nowMs() + i * 86400_000);
    if (offset(PRACTICE_TZ, a) - offset(tz, a) !== offset(PRACTICE_TZ, b) - offset(tz, b)) dst = b;
  }
  const diffAfter = dst ? Math.abs(offset(tz, dst) - offset(PRACTICE_TZ, dst)) : 0;

  return (
    <div className="mx-auto max-w-[900px]">
      <h1 className="h-display text-[34px] md:text-[38px]">Same time, two places</h1>
      <p className="mt-1.5 text-[15.5px] text-body">Choose a time on your clock. We show the doctor’s time beside it.</p>
      <div className="mt-5 grid gap-5 md:grid-cols-[1.4fr_1fr]">
        <Card className="!p-0">
          <div className="grid grid-cols-2 border-b border-line px-5 py-3 text-[12px] font-extrabold uppercase tracking-[.12em] text-muted">
            <span>
              Your time · {zoneCity(tz)} ({zoneAbbr(tz)})
            </span>
            <span>Dr. Oparaji · US Central ({zoneAbbr(PRACTICE_TZ)})</span>
          </div>
          {daySlots.length === 0 && <p className="p-5 text-sm text-body">No open times that day.</p>}
          {daySlots.map((s) => {
            const on = selected && s.getTime() === selected.getTime();
            return (
              <Link
                key={s.toISOString()}
                href={`/portal/book/time?type=${vt.slug}&day=${day}&slot=${s.toISOString()}`}
                scroll={false}
                className={cn("grid grid-cols-2 border-b border-line-soft px-5 py-3.5 text-[15px] last:border-b-0", on ? "bg-sage font-bold text-forest" : "hover:bg-canvas")}
              >
                <span>{fmtTime(s, tz)}</span>
                <span className="text-body">{fmtTime(s, PRACTICE_TZ)}</span>
              </Link>
            );
          })}
        </Card>
        <div className="flex flex-col gap-4">
          {selected && (
            <Card>
              <div className="eyebrow">Selected</div>
              <div className="mt-1.5 font-display text-2xl">
                {fmt(selected, tz, "EEE d MMM")} · {fmtTime(selected, tz)} {zoneAbbr(tz, selected)}
              </div>
              <div className="text-sm text-body">
                {fmtTime(selected, PRACTICE_TZ)} {zoneAbbr(PRACTICE_TZ, selected)} for Dr. Oparaji
              </div>
              <Link href={`/portal/book?type=${vt.slug}&slot=${selected.toISOString()}`} className="mt-4 block rounded-full bg-forest py-3 text-center font-bold text-white">
                Confirm time
              </Link>
            </Card>
          )}
          {dst && (
            <div className="rounded-[20px] bg-gold-tint p-4 text-sm text-warning">
              On {fmt(dst, tz, "EEE d MMM")} clocks change, so the difference becomes {diffAfter / 3600000} hours. Times adjust automatically.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
