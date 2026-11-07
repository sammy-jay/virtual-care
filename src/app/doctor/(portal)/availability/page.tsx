import Link from "next/link";
import type { Metadata } from "next";
import { Modal, ModalActions } from "@/components/modal";
import { Alert, Button, ButtonLink, Card, PageTitle, Row } from "@/components/ui";
import { requireDoctor } from "@/lib/auth/dal";
import { getPractice } from "@/lib/care";
import { db } from "@/lib/db";
import { cn, pluralize } from "@/lib/format";
import { dayKey, fmt, PRACTICE_TZ, zoneAbbr, nowMs } from "@/lib/time";
import { addTimeOff, addWindow, copyDay, removeTimeOff, removeWindow, saveBookingRules } from "../../actions";

export const metadata: Metadata = { title: "Availability" };

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEK = [1, 2, 3, 4, 5, 6, 0];
const t12 = (m: number) => {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h % 12 || 12}${mm ? `:${String(mm).padStart(2, "0")}` : ""} ${h >= 12 && h < 24 ? "PM" : "AM"}`;
};
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export default async function AvailabilityPage({ searchParams }: PageProps<"/doctor/availability">) {
  await requireDoctor();
  const sp = await searchParams;
  const tz = PRACTICE_TZ;
  const [windows, off, types, practice] = await Promise.all([
    db.availabilityWindow.findMany({ orderBy: { startMin: "asc" } }),
    db.timeOff.findMany({ where: { endAt: { gte: new Date() } }, orderBy: { startAt: "asc" } }),
    db.visitType.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    getPractice(),
  ]);
  const clashes = await Promise.all(off.map((o) => db.appointment.count({ where: { status: "SCHEDULED", startsAt: { gte: o.startAt, lt: o.endAt } } })));
  const dialog = typeof sp.dialog === "string" ? sp.dialog : null;
  const showSat = windows.some((w) => w.weekday === 6 || w.weekday === 0);
  const week = showSat ? WEEK : WEEK.slice(0, 5);
  const copyFrom = Number(sp.from ?? 4);
  const typeName = (ids: string[]) => (ids.length ? ids.map((i) => types.find((t) => t.id === i)?.name).filter(Boolean).join(", ") : "");
  const tomorrow = dayKey(new Date(nowMs() + 86400_000), tz);

  return (
    <div className="mx-auto max-w-[1200px]">
      <PageTitle
        title="Availability"
        subtitle={`Hours shown in Houston time (${zoneAbbr(tz)}). Patients see their own time.`}
        actions={
          <>
            <ButtonLink href="/doctor/availability?dialog=timeoff" variant="secondary">
              Block time off
            </ButtonLink>
            <ButtonLink href="/doctor/availability?dialog=window">Add window</ButtonLink>
          </>
        }
      />
      {sp.saved === "1" && <Alert tone="success" className="mb-4">Booking rules saved.</Alert>}
      <div className={cn("grid gap-3", showSat ? "sm:grid-cols-4 lg:grid-cols-7" : "sm:grid-cols-3 lg:grid-cols-5")}>
        {week.map((d) => {
          const ws = windows.filter((w) => w.weekday === d);
          return (
            <Card key={d} className="flex flex-col !p-4">
              <b>{DAYS[d].slice(0, 3)}</b>
              <div className="mt-3 flex flex-1 flex-col gap-2">
                {ws.length === 0 && <span className="rounded-xl bg-canvas px-3 py-2.5 text-sm text-muted">Day off</span>}
                {ws.map((w) => (
                  <div key={w.id} className="group flex items-start justify-between rounded-xl bg-sage px-3 py-2.5 text-sm font-semibold text-forest">
                    <span>
                      {t12(w.startMin)} to {t12(w.endMin)}
                      {w.visitTypeIds.length > 0 && <span className="block text-[12px] font-medium text-sage-ink">{typeName(w.visitTypeIds)}</span>}
                    </span>
                    <form action={removeWindow}>
                      <input type="hidden" name="id" value={w.id} />
                      <button aria-label={`Remove ${t12(w.startMin)} window`} className="text-sage-ink hover:text-danger">
                        ×
                      </button>
                    </form>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-[13px] font-bold text-forest">
                <Link href={`/doctor/availability?dialog=window&day=${d}`}>+ Add</Link>
                {ws.length > 0 && (
                  <>
                    {" · "}
                    <Link href={`/doctor/availability?dialog=copy&from=${d}`}>Copy</Link>
                  </>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <b className="font-display text-[22px] font-normal">Upcoming time off</b>
          {off.length === 0 && <p className="mt-2 text-sm text-body">None scheduled.</p>}
          {off.map((o, i) => {
            const end = new Date(o.endAt.getTime() - 1);
            const same = dayKey(o.startAt, tz) === dayKey(end, tz);
            return (
              <div key={o.id} className="flex items-center justify-between gap-3 border-t border-line-soft py-3 first-of-type:mt-2">
                <span>
                  <b className="block text-[15px]">{same ? fmt(o.startAt, tz, "EEE d MMM") : `${fmt(o.startAt, tz, "EEE d")} to ${fmt(end, tz, "EEE d MMM")}`}</b>
                  <span className="text-[13px] text-muted">
                    {o.note ?? "Time off"}
                    {clashes[i] ? ` · ${pluralize(clashes[i], "visit")} to reschedule` : ""}
                  </span>
                </span>
                <form action={removeTimeOff}>
                  <input type="hidden" name="id" value={o.id} />
                  <Button variant="ghost" size="sm">
                    Remove
                  </Button>
                </form>
              </div>
            );
          })}
        </Card>
        <Card>
          <b className="font-display text-[22px] font-normal">Booking rules</b>
          <form action={saveBookingRules} className="mt-2">
            <Row label="Notice needed">
              <select name="noticeHours" defaultValue={practice.noticeHours} className="field !min-h-0 !w-auto !py-1.5" aria-label="Notice needed">
                {[2, 6, 12, 24, 48].map((h) => (
                  <option key={h} value={h}>{h} hours</option>
                ))}
              </select>
            </Row>
            <Row label="Buffer between visits">
              <select name="bufferMinutes" defaultValue={practice.bufferMinutes} className="field !min-h-0 !w-auto !py-1.5" aria-label="Buffer between visits">
                {[0, 5, 10, 15, 30].map((m) => (
                  <option key={m} value={m}>{m} min</option>
                ))}
              </select>
            </Row>
            <Row label="Free cancellation">
              <select name="cancelHours" defaultValue={practice.cancelHours} className="field !min-h-0 !w-auto !py-1.5" aria-label="Free cancellation">
                {[6, 12, 24, 48].map((h) => (
                  <option key={h} value={h}>Up to {h} hours before</option>
                ))}
              </select>
            </Row>
            <div className="mt-3 flex justify-end">
              <Button size="sm">Save rules</Button>
            </div>
          </form>
        </Card>
      </div>

      {dialog === "window" && (
        <Modal closeHref="/doctor/availability" title="Add availability" subtitle="Patients can book inside these windows.">
          {sp.error && <Alert tone="error" className="mb-3">The end time must be after the start time.</Alert>}
          <form action={addWindow} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="weekday" className="label">Day</label>
                <select id="weekday" name="weekday" defaultValue={String(sp.day ?? 4)} className="field">
                  {WEEK.map((d) => (
                    <option key={d} value={d}>{DAYS[d]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="vt" className="label">Visit types</label>
                <select id="vt" name="visitTypeIds" defaultValue="all" className="field">
                  <option value="all">All</option>
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} only</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="from" className="label">From ({zoneAbbr(tz)})</label>
                <input id="from" name="from" type="time" step={1800} defaultValue={hhmm(12 * 60)} className="field" />
              </div>
              <div>
                <label htmlFor="to" className="label">To ({zoneAbbr(tz)})</label>
                <input id="to" name="to" type="time" step={1800} defaultValue={hhmm(18 * 60)} className="field" />
              </div>
            </div>
            <p className="text-[13px] text-muted">Repeats every week.</p>
            <ModalActions>
              <ButtonLink href="/doctor/availability" variant="secondary">Cancel</ButtonLink>
              <Button>Add window</Button>
            </ModalActions>
          </form>
        </Modal>
      )}

      {dialog === "timeoff" && (
        <Modal closeHref="/doctor/availability" title="Block time off" subtitle="No one can book during this time.">
          {sp.error && <Alert tone="error" className="mb-3">Choose a start and an end on or after it.</Alert>}
          <form action={addTimeOff} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="off-from" className="label">From</label>
                <input id="off-from" name="from" type="date" defaultValue={tomorrow} className="field" />
              </div>
              <div>
                <label htmlFor="off-to" className="label">To</label>
                <input id="off-to" name="to" type="date" defaultValue={tomorrow} className="field" />
              </div>
            </div>
            <div>
              <label htmlFor="note" className="label">Note to yourself</label>
              <input id="note" name="note" placeholder="e.g. Conference" className="field" />
            </div>
            <p className="rounded-xl bg-gold-tint px-3.5 py-2.5 text-[13.5px] text-warning">Visits already booked in this range stay booked. You will see them flagged here to reschedule.</p>
            <ModalActions>
              <ButtonLink href="/doctor/availability" variant="secondary">Cancel</ButtonLink>
              <Button>Block time</Button>
            </ModalActions>
          </form>
        </Modal>
      )}

      {dialog === "copy" && (
        <Modal closeHref="/doctor/availability" title={`Copy ${DAYS[copyFrom]} hours`} subtitle="Apply the same windows to other days. Their current windows are replaced.">
          <form action={copyDay}>
            <input type="hidden" name="from" value={copyFrom} />
            <div className="flex flex-wrap gap-2">
              {WEEK.filter((d) => d !== copyFrom).map((d) => (
                <label key={d} className="flex cursor-pointer items-center gap-2 rounded-full border-[1.5px] border-line px-4 py-2.5 font-semibold has-[:checked]:border-forest has-[:checked]:bg-sage has-[:checked]:text-forest">
                  <input type="checkbox" name="to" value={d} className="accent-forest" />
                  {DAYS[d].slice(0, 3)}
                </label>
              ))}
            </div>
            <ModalActions>
              <ButtonLink href="/doctor/availability" variant="secondary">Cancel</ButtonLink>
              <Button>Copy hours</Button>
            </ModalActions>
          </form>
        </Modal>
      )}
    </div>
  );
}
