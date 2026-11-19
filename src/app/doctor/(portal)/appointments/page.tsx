import Link from "@/components/market";
import type { Metadata } from "next";
import { addDays } from "date-fns";
import { Modal, ModalActions, ModalSummary } from "@/components/modal";
import { Icon } from "@/components/icons";
import { Alert, Button, ButtonLink, Card, PageTitle, Row, StatusTag } from "@/components/ui";
import { requireDoctor } from "@/lib/auth/dal";
import { loadOpenSlots } from "@/lib/booking";
import { db } from "@/lib/db";
import { cn, money, shortName } from "@/lib/format";
import { dayKey, fmt, fmtTime, PRACTICE_TZ, weekdayIn, zonedWallToUtc } from "@/lib/time";
import { markNoShow, undoNoShow, doctorReschedule } from "../../actions";

export const metadata: Metadata = { title: "Appointments" };

const TYPE_TONE: Record<string, string> = {
  "follow-up": "bg-sage text-forest border-forest/30",
  "family-coaching": "bg-gold-tint text-gold-ink border-gold/40",
  "initial-consultation": "bg-sky-tint text-sky border-sky/30",
  intro: "bg-coral-tint text-coral-ink border-coral/30",
};
const SHORT: Record<string, string> = { "follow-up": "Follow-up", "family-coaching": "Coaching", "initial-consultation": "Initial", intro: "Intro" };

export default async function AppointmentsPage({ searchParams }: PageProps<"/doctor/appointments">) {
  await requireDoctor();
  const sp = await searchParams;
  const tz = PRACTICE_TZ;
  const anchor = typeof sp.week === "string" ? zonedWallToUtc(sp.week, 12 * 60, tz) : new Date();
  const back = (weekdayIn(anchor, tz) + 6) % 7; // Monday-based
  const monday = dayKey(addDays(anchor, -back), tz);
  const weekStart = zonedWallToUtc(monday, 0, tz);
  const days = Array.from({ length: 5 }, (_, i) => dayKey(addDays(zonedWallToUtc(monday, 12 * 60, tz), i), tz));
  const weekEnd = zonedWallToUtc(dayKey(addDays(zonedWallToUtc(monday, 12 * 60, tz), 7), tz), 0, tz);

  const appts = await db.appointment.findMany({
    where: { startsAt: { gte: weekStart, lt: weekEnd }, status: { in: ["SCHEDULED", "COMPLETED", "NO_SHOW", "PENDING_PAYMENT"] } },
    include: { patient: true, visitType: true, membership: { include: { plan: true } } },
    orderBy: { startsAt: "asc" },
  });
  const selectedDay = typeof sp.day === "string" && days.includes(sp.day) ? sp.day : days.includes(dayKey(new Date(), tz)) ? dayKey(new Date(), tz) : days[0];
  const dayList = appts.filter((a) => dayKey(a.startsAt, tz) === selectedDay);
  const selected = appts.find((a) => a.id === sp.id) ?? (typeof sp.id === "string" ? await db.appointment.findUnique({ where: { id: sp.id }, include: { patient: true, visitType: true, membership: { include: { plan: true } } } }) : null) ?? dayList.find((a) => a.status === "SCHEDULED") ?? dayList[0];
  const dialog = typeof sp.dialog === "string" ? sp.dialog : null;
  const base = `/doctor/appointments?week=${monday}&day=${selectedDay}${selected ? `&id=${selected.id}` : ""}`;

  const hours = [12, 13, 14, 15, 16, 17, 18];
  const hourOf = (d: Date) => Number(fmt(d, tz, "H")) + Number(fmt(d, tz, "m")) / 60;
  const resched = dialog === "reschedule" && selected ? (await loadOpenSlots(selected.visitType, new Date(), 14, selected.id)).slice(0, 8) : [];
  const price = (a: (typeof appts)[number]) => (a.pricingReason === "INCLUDED" ? "included" : a.pricingReason === "FREE" ? "Free" : money(a.priceCents, a.currency));
  const prev = dayKey(addDays(zonedWallToUtc(monday, 12 * 60, tz), -7), tz);
  const next = dayKey(addDays(zonedWallToUtc(monday, 12 * 60, tz), 7), tz);

  return (
    <div className="mx-auto max-w-[1200px]">
      <PageTitle
        title="Appointments"
        subtitle={
          <span className="flex items-center gap-2">
            <Link href={`/doctor/appointments?week=${prev}`} aria-label="Previous week" className="flex size-8 items-center justify-center rounded-full hover:bg-white">
              <Icon name="chevronLeft" size={16} />
            </Link>
            Week of {fmt(weekStart, tz, "d MMM")}
            <Link href={`/doctor/appointments?week=${next}`} aria-label="Next week" className="flex size-8 items-center justify-center rounded-full hover:bg-white">
              <Icon name="chevronRight" size={16} />
            </Link>
          </span>
        }
        actions={
          <>
            <ButtonLink href="/doctor/availability?dialog=timeoff" variant="secondary">
              Block time
            </ButtonLink>
            <ButtonLink href="/doctor/availability">Set availability</ButtonLink>
          </>
        }
      />
      {sp.moved === "1" && <Alert tone="success" className="mb-4">New time sent. The patient was emailed.</Alert>}
      {sp.undo === "1" && selected?.status === "NO_SHOW" && (
        <Alert tone="info" className="mb-4">
          Marked as no-show. The patient was emailed.{" "}
          <form action={undoNoShow} className="inline">
            <input type="hidden" name="id" value={selected.id} />
            <button className="font-bold underline">Undo</button>
          </form>{" "}
          (available for 24 hours)
        </Alert>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.7fr_1fr]">
        <Card className="overflow-x-auto !p-4">
          <div className="grid min-w-[620px] grid-cols-[56px_repeat(5,1fr)] gap-x-2">
            <div />
            {days.map((d) => (
              <Link key={d} href={`/doctor/appointments?week=${monday}&day=${d}`} className={cn("rounded-xl py-2 text-center text-sm font-bold", d === selectedDay ? "bg-forest text-white" : "text-body hover:bg-canvas")}>
                {fmt(zonedWallToUtc(d, 12 * 60, tz), tz, "EEE d")}
              </Link>
            ))}
            <div className="relative col-span-6 mt-2 grid grid-cols-[56px_repeat(5,1fr)] gap-x-2" style={{ height: hours.length * 64 }}>
              {hours.map((h, i) => (
                <div key={h} className="absolute left-0 right-0 border-t border-line-soft text-[12px] text-muted" style={{ top: i * 64 }}>
                  {h > 12 ? h - 12 : h} {h >= 12 ? "PM" : "AM"}
                </div>
              ))}
              <div />
              {days.map((d) => (
                <div key={d} className="relative">
                  {appts
                    .filter((a) => dayKey(a.startsAt, tz) === d)
                    .map((a) => {
                      const top = (hourOf(a.startsAt) - hours[0]) * 64;
                      const height = Math.max(30, (a.visitType.durationMin / 60) * 64 - 3);
                      return (
                        <Link
                          key={a.id}
                          href={`/doctor/appointments?week=${monday}&day=${d}&id=${a.id}`}
                          scroll={false}
                          className={cn("absolute inset-x-0 overflow-hidden rounded-lg border px-2 py-1 text-[12px] leading-tight", TYPE_TONE[a.visitType.slug] ?? "bg-line-soft", selected?.id === a.id && "ring-2 ring-forest", a.status === "NO_SHOW" && "line-through opacity-60")}
                          style={{ top: Math.max(0, top), height }}
                        >
                          <b className="block truncate">{a.visitType.alwaysFree ? "Intro" : shortName(a.patient?.name ?? "")}</b>
                          <span className="truncate">{a.visitType.alwaysFree ? `${a.visitType.durationMin} min` : SHORT[a.visitType.slug] ?? a.visitType.name}</span>
                        </Link>
                      );
                    })}
                </div>
              ))}
            </div>
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <b className="font-display text-[22px] font-normal">{fmt(zonedWallToUtc(selectedDay, 12 * 60, tz), tz, "EEE d MMM")}</b>
            {dayList.length === 0 && <p className="mt-2 text-sm text-body">No visits.</p>}
            {dayList.map((a) => (
              <Link key={a.id} href={`/doctor/appointments?week=${monday}&day=${selectedDay}&id=${a.id}`} scroll={false} className={cn("mt-2 flex items-center justify-between rounded-xl px-3 py-2.5", selected?.id === a.id ? "bg-sage" : "hover:bg-canvas")}>
                <span>
                  <b className="block text-[14.5px]">
                    {fmtTime(a.startsAt, tz)} · {a.visitType.alwaysFree ? "Intro call" : shortName(a.patient?.name ?? "")}
                  </b>
                  <span className="text-[13px] text-muted">
                    {SHORT[a.visitType.slug] ?? a.visitType.name} · {price(a)}
                  </span>
                </span>
                {a.status !== "SCHEDULED" && <StatusTag status={a.status} />}
              </Link>
            ))}
          </Card>
          {selected && (
            <Card>
              <b className="block text-[16px]">{selected.patient?.name}</b>
              <span className="text-sm text-muted">
                {selected.visitType.name} · {fmt(selected.startsAt, tz, "EEE d MMM, h:mm a")}
              </span>
              {selected.reason && <p className="mt-2 rounded-xl bg-canvas px-3 py-2 text-sm">{selected.reason}</p>}
              <div className="mt-4 flex flex-wrap gap-2">
                {selected.status === "SCHEDULED" && (
                  <>
                    <ButtonLink href={`/doctor/visits/${selected.id}/waiting`} size="sm" icon="video">
                      Start
                    </ButtonLink>
                    <ButtonLink href={`${base}&dialog=reschedule`} size="sm" variant="secondary" scroll={false}>
                      Reschedule
                    </ButtonLink>
                    <ButtonLink href={`${base}&dialog=noshow`} size="sm" variant="ghost" scroll={false}>
                      Mark no-show
                    </ButtonLink>
                  </>
                )}
                <ButtonLink href={`/doctor/patients/${selected.patientId}`} size="sm" variant="ghost">
                  Patient record
                </ButtonLink>
                <ButtonLink href={`/doctor/visits/${selected.id}/notes`} size="sm" variant="ghost">
                  Notes
                </ButtonLink>
              </div>
            </Card>
          )}
        </div>
      </div>

      {dialog === "reschedule" && selected && (
        <Modal closeHref={base} title="Reschedule visit" subtitle={`${selected.patient?.name} · ${selected.visitType.name} · ${fmt(selected.startsAt, tz, "EEE d MMM h:mm a")} ${fmt(selected.startsAt, tz, "zzz")}`}>
          {sp.error && <Alert tone="error" className="mb-3">That time is no longer open. Pick another.</Alert>}
          <form action={doctorReschedule}>
            <input type="hidden" name="id" value={selected.id} />
            <div className="grid grid-cols-2 gap-2.5">
              {resched.map((s, i) => (
                <label key={s.toISOString()} className="cursor-pointer">
                  <input type="radio" name="slot" value={s.toISOString()} defaultChecked={i === 0} className="peer sr-only" />
                  <span className="block rounded-xl border-[1.5px] border-line py-3 text-center text-sm font-semibold peer-checked:border-forest peer-checked:bg-forest peer-checked:text-white">
                    {fmt(s, tz, "EEE d")} · {fmt(s, tz, "h a").replace(":00", "")}
                  </span>
                </label>
              ))}
            </div>
            <p className="mt-4 text-sm text-body">The patient is emailed{selected.usesAllowance ? " and their included visit stays reserved" : ""}. No charge.</p>
            <ModalActions>
              <ButtonLink href={base} variant="secondary">
                Cancel
              </ButtonLink>
              <Button disabled={!resched.length}>Send new time</Button>
            </ModalActions>
          </form>
        </Modal>
      )}

      {dialog === "noshow" && selected && (
        <Modal closeHref={base} title="Mark as no-show?" subtitle={`${selected.patient?.name} did not join the ${fmtTime(selected.startsAt, tz)} visit.`} icon="alert" iconTone="coral">
          <ModalSummary>
            <Row label="Charge">{selected.usesAllowance ? "Included visit is used" : selected.priceCents ? `${money(selected.priceCents, selected.currency)} is kept` : "None"}</Row>
            <Row label="Patient notified">Yes, by email</Row>
            <Row label="Can be undone">For 24 hours</Row>
          </ModalSummary>
          <form action={markNoShow}>
            <input type="hidden" name="id" value={selected.id} />
            <ModalActions>
              <ButtonLink href={`/doctor/visits/${selected.id}/waiting`} variant="secondary">
                Keep waiting
              </ButtonLink>
              <Button variant="danger">Mark no-show</Button>
            </ModalActions>
          </form>
        </Modal>
      )}
    </div>
  );
}
