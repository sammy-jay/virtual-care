import Link from "@/components/market";
import type { Metadata } from "next";
import { Modal, ModalActions, ModalSummary } from "@/components/modal";
import { Alert, Button, ButtonLink, Card, EmptyState, PageTitle, Row, StatusTag } from "@/components/ui";
import { requirePatient } from "@/lib/auth/dal";
import { loadOpenSlots } from "@/lib/booking";
import { getPractice } from "@/lib/care";
import { db } from "@/lib/db";
import { cn, money } from "@/lib/format";
import { fmt, fmtShort, fmtTime, fmtWhen, PRACTICE_TZ, zoneAbbr, nowMs } from "@/lib/time";
import { canCancelFree, priceLabel } from "@/lib/visit-labels";
import { cancelVisit, rescheduleVisit } from "./actions";

export const metadata: Metadata = { title: "My visits" };

export default async function MyVisitsPage({ searchParams }: PageProps<"/portal/visits">) {
  const user = await requirePatient();
  const sp = await searchParams;
  const tz = user.timeZone;
  const practice = await getPractice();
  const all = await db.appointment.findMany({
    where: { patientId: user.id },
    include: { visitType: true, membership: { include: { plan: true } }, carePlan: true },
    orderBy: { startsAt: "desc" },
  });
  const now = nowMs();
  const upcoming = all.filter((a) => (a.status === "SCHEDULED" || a.status === "PENDING_PAYMENT") && a.endsAt.getTime() > now - 60 * 60_000).reverse();
  const past = all.filter((a) => !upcoming.includes(a));
  const tab = sp.tab === "past" ? "past" : "upcoming";
  const list = tab === "past" ? past : upcoming;
  const selected = all.find((a) => a.id === sp.id) ?? list[0] ?? null;
  const dialog = typeof sp.dialog === "string" ? sp.dialog : null;
  const base = `/portal/visits?tab=${tab}${selected ? `&id=${selected.id}` : ""}`;
  const isUpcoming = selected && upcoming.includes(selected);

  const resched = dialog === "reschedule" && selected ? (await loadOpenSlots(selected.visitType, new Date(), 14, selected.id)).slice(0, 12) : [];

  const subline = (a: (typeof all)[number]) =>
    [`${a.visitType.durationMin} min`, priceLabel(a), a.carePlan?.status === "PUBLISHED" ? "care plan published" : null].filter(Boolean).join(" · ");

  return (
    <div className="mx-auto max-w-[1140px]">
      <PageTitle title="My visits" actions={<ButtonLink href="/portal/book" icon="plus">Book a visit</ButtonLink>} />
      {sp.released === "1" && <Alert tone="info" className="mb-4">The 30-minute hold on that time ran out before your payment finished, so we refunded you in full. Please book a new time.</Alert>}
      {sp.cancelled === "1" && <Alert tone="success" className="mb-4">Your visit was cancelled. If you had paid, the refund is on its way.</Alert>}

      <div className="mb-4 flex gap-1 rounded-full bg-white p-1 sm:w-fit" role="tablist">
        {(["upcoming", "past"] as const).map((t) => (
          <Link key={t} href={`/portal/visits?tab=${t}`} role="tab" aria-selected={tab === t} className={cn("flex-1 rounded-full px-5 py-2 text-center text-sm font-bold capitalize sm:flex-none", tab === t ? "bg-forest text-white" : "text-body")}>
            {t}
            <span className={cn("num ml-1.5 rounded-full px-1.5 py-px text-[12px]", tab === t ? "bg-white/20" : "bg-canvas")}>{(t === "past" ? past : upcoming).length}</span>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-3">
          {list.length === 0 && (
            <EmptyState title={tab === "upcoming" ? "No upcoming visits" : "No past visits yet"} body="Book your next visit when you are ready." action={<ButtonLink href="/portal/book">Book a visit</ButtonLink>} />
          )}
          {list.map((a) => {
            const on = selected?.id === a.id;
            return (
              <Link
                key={a.id}
                href={`/portal/visits?tab=${tab}&id=${a.id}#visit-detail`}
                aria-current={on ? "true" : undefined}
                className={cn(
                  "flex items-center gap-4 rounded-[18px] border-2 bg-white p-3.5 pr-4 transition-colors sm:p-4 sm:pr-5",
                  on ? "border-forest" : "border-transparent shadow-[0_0_0_1px_var(--color-line)] hover:shadow-[0_0_0_1px_var(--color-sage-line)]",
                )}
              >
                <div className={cn("flex w-[54px] flex-none flex-col items-center rounded-xl py-2 leading-none", on ? "bg-forest text-white" : "bg-sage text-forest")}>
                  <span className="text-[11px] font-bold uppercase tracking-wider">{fmt(a.startsAt, tz, "MMM")}</span>
                  <span className="num mt-1 font-display text-[24px]">{fmt(a.startsAt, tz, "d")}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <b className="block text-[15.5px] leading-snug">{a.visitType.name}</b>
                  <span className="num block text-[13.5px] text-body">
                    {tab === "upcoming" ? fmt(a.startsAt, tz, "EEEE") : fmtShort(a.startsAt, tz)} · {fmtTime(a.startsAt, tz)} {zoneAbbr(tz, a.startsAt)}
                  </span>
                  <span className="block text-[13px] text-muted">{subline(a)}</span>
                  {a.status !== "SCHEDULED" && (
                    <span className="mt-1.5 block sm:hidden">
                      <StatusTag status={a.status} />
                    </span>
                  )}
                </div>
                <span className="hidden flex-none sm:block">
                  <StatusTag status={a.status} />
                </span>
              </Link>
            );
          })}
        </div>

        {selected && (
          <Card id="visit-detail" className="min-w-0 scroll-mt-20 lg:sticky lg:top-24">
            <div className="eyebrow">Visit detail</div>
            <div className="mt-1.5 font-display text-[24px] leading-tight sm:text-[26px]">
              {selected.visitType.name} · {fmt(selected.startsAt, tz, "EEE d MMM")}
            </div>
            <div className="num mb-2 mt-1 text-sm text-body">
              {fmtTime(selected.startsAt, tz)} {zoneAbbr(tz, selected.startsAt)} · {fmtTime(selected.startsAt, PRACTICE_TZ)} {zoneAbbr(PRACTICE_TZ, selected.startsAt)} for Dr. Oparaji
            </div>
            <Row label="Price">{priceLabel(selected)}</Row>
            <Row label="Status">
              <StatusTag status={selected.status} />
            </Row>
            {isUpcoming && <Row label="Room">Opens {practice.roomOpensMinBefore} min before</Row>}
            <Row label="Care plan">
              {selected.carePlan?.status === "PUBLISHED" ? (
                <Link href={`/portal/care-plans/${selected.carePlan.id}`} className="text-forest underline">
                  View plan
                </Link>
              ) : (
                "Published after your visit"
              )}
            </Row>
            {isUpcoming && selected.status === "PENDING_PAYMENT" && (
              <div className="mt-4">
                <ButtonLink href={`/portal/visits/${selected.id}/pay`} className="w-full">
                  Pay {money(selected.priceCents, selected.currency)} to confirm
                </ButtonLink>
              </div>
            )}
            {isUpcoming && selected.status === "SCHEDULED" && (
              <>
                <div className="mt-4 flex flex-wrap gap-3">
                  <ButtonLink href={`/portal/visits/${selected.id}/precheck`} icon="video" className="min-w-[180px] flex-[2]">
                    Join video visit
                  </ButtonLink>
                  <ButtonLink href={`${base}&dialog=${canCancelFree(selected, practice.cancelHours) ? "reschedule" : "blocked"}`} variant="secondary" scroll={false} className="flex-1">
                    Reschedule
                  </ButtonLink>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[13px]">
                  <span className="text-muted">Backup link shown if video fails</span>
                  <Link href={`${base}&dialog=${canCancelFree(selected, practice.cancelHours) ? "cancel" : "blocked"}`} scroll={false} className="font-bold text-danger">
                    Cancel visit
                  </Link>
                </div>
              </>
            )}
            {!isUpcoming && selected.status === "COMPLETED" && (
              <div className="mt-4 flex gap-3">
                <ButtonLink href="/portal/book" variant="secondary" className="flex-1">
                  Book again
                </ButtonLink>
                <ButtonLink href={`/portal/visits/${selected.id}/feedback`} variant="ghost">
                  Rate visit
                </ButtonLink>
              </div>
            )}
          </Card>
        )}
      </div>

      {dialog === "cancel" && selected && (
        <Modal closeHref={base} title="Cancel this visit?" subtitle={`${selected.visitType.name} · ${fmtWhen(selected.startsAt, tz)}`} icon="calendar" iconTone="coral">
          <p className="text-[15px] text-body">
            {selected.usesAllowance && `Your included visit returns to your ${fmt(selected.startsAt, tz, "MMMM")} allowance. `}
            {selected.status === "SCHEDULED" && selected.priceCents > 0
              ? `You paid ${money(selected.priceCents, selected.currency)}. It is refunded automatically to your card.`
              : "If you had paid for this visit, it is refunded automatically."}
          </p>
          <form action={cancelVisit}>
            <input type="hidden" name="id" value={selected.id} />
            <ModalActions>
              <ButtonLink href={base} variant="secondary" scroll={false}>
                Keep visit
              </ButtonLink>
              <Button variant="danger">Cancel visit</Button>
            </ModalActions>
          </form>
        </Modal>
      )}

      {dialog === "blocked" && selected && (
        <Modal closeHref={base} title="Too close to cancel online" subtitle={`Free cancellation closes ${practice.cancelHours} hours before the visit. Message Dr. Oparaji and she will help you reschedule if she can.`} icon="clock" iconTone="gold">
          <ModalActions>
            <ButtonLink href={base} variant="secondary" scroll={false}>
              Close
            </ButtonLink>
            <ButtonLink href="/portal/messages">Message Dr. Oparaji</ButtonLink>
          </ModalActions>
        </Modal>
      )}

      {dialog === "reschedule" && selected && (
        <Modal closeHref={base} title="Reschedule your visit" subtitle={`${selected.visitType.name} · ${fmtWhen(selected.startsAt, tz)}`} icon="calendar">
          {sp.error === "taken" && <Alert tone="error" className="mb-3">That time was just taken. Pick another.</Alert>}
          <form action={rescheduleVisit}>
            <input type="hidden" name="id" value={selected.id} />
            <fieldset className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              <legend className="sr-only">New time</legend>
              {resched.map((s, i) => (
                <label key={s.toISOString()} className="cursor-pointer">
                  <input type="radio" name="slot" value={s.toISOString()} defaultChecked={i === 0} className="peer sr-only" />
                  <span className="block rounded-xl border-[1.5px] border-line py-3 text-center text-sm font-semibold peer-checked:border-forest peer-checked:bg-forest peer-checked:text-white peer-focus-visible:ring-3 peer-focus-visible:ring-forest/30">
                    {fmt(s, tz, "EEE d")} · {fmtTime(s, tz)}
                  </span>
                </label>
              ))}
            </fieldset>
            {resched.length === 0 && <p className="text-sm text-body">No other open times in the next two weeks.</p>}
            <ModalSummary>
              <p className="py-3 text-sm text-body">
                {selected.usesAllowance ? "Your included visit stays reserved. " : ""}Changes are free up to {practice.cancelHours} hours before.
              </p>
            </ModalSummary>
            <ModalActions>
              <ButtonLink href={base} variant="secondary" scroll={false}>
                Keep current time
              </ButtonLink>
              <Button disabled={!resched.length}>Confirm new time</Button>
            </ModalActions>
          </form>
        </Modal>
      )}
    </div>
  );
}
