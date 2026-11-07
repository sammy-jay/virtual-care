import Link from "next/link";
import type { Metadata } from "next";
import { ButtonLink, Card, Eyebrow, Tag } from "@/components/ui";
import { requirePatient } from "@/lib/auth/dal";
import { allowanceUsed, getActiveMembership, getPlans, getVisitTypes, messagingAccess, unreadForPatient } from "@/lib/care";
import { db } from "@/lib/db";
import { firstName, money, moneyShort } from "@/lib/format";
import { profileSections } from "@/lib/profile";
import { fmt, fmtShort, fmtTime, greeting, PRACTICE_TZ, zoneAbbr } from "@/lib/time";
import { priceLabel, roomWindow } from "@/lib/visit-labels";

export const metadata: Metadata = { title: "Overview" };

export default async function OverviewPage() {
  const user = await requirePatient();
  const tz = user.timeZone;
  const [membership, next, plans, unread, lastMsg, profile, weights, visitCount, types, access] = await Promise.all([
    getActiveMembership(user.id),
    db.appointment.findFirst({
      where: { patientId: user.id, status: { in: ["SCHEDULED", "PENDING_PAYMENT"] }, endsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
      include: { visitType: true, membership: { include: { plan: true } } },
    }),
    db.carePlan.findMany({ where: { patientId: user.id, status: "PUBLISHED" }, orderBy: { publishedAt: "desc" }, take: 2, include: { appointment: { include: { visitType: true } } } }),
    unreadForPatient(user.id),
    db.message.findFirst({ where: { conversation: { patientId: user.id, kind: "doctor" }, fromDoctor: true, kind: "TEXT" }, orderBy: { createdAt: "desc" } }),
    db.patientProfile.findUnique({ where: { userId: user.id } }),
    db.measurement.findMany({ where: { patientId: user.id, kind: "WEIGHT" }, orderBy: { takenAt: "asc" } }),
    db.appointment.count({ where: { patientId: user.id, status: { not: "CANCELED" } } }),
    getVisitTypes(),
    messagingAccess(user.id),
  ]);
  const prof = profileSections(user, profile);

  // 05.2 — brand-new patient
  if (visitCount === 0 && !membership) {
    const followUp = types.find((t) => t.slug === "follow-up");
    const connect = (await getPlans())[0];
    const steps = [
      ["Book your free intro call", "15 minutes by video, no card needed", "/portal/book?type=intro", "Book"],
      ["Complete your health profile", `${prof.pct}% complete · takes about 3 minutes`, "/portal/health-profile", prof.pct ? "Continue" : "Start"],
      ["Choose how to pay for care", "Pay per visit, or join a plan for included visits", "/membership", "View plans"],
    ];
    return (
      <div className="mx-auto max-w-[1140px]">
        <h1 className="h-display text-[34px] md:text-[38px]">Welcome, {firstName(user.name)}</h1>
        <p className="mt-1.5 text-[15.5px] text-body">Three quick steps to get started.</p>
        <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <Card className="!p-0">
            {steps.map(([t, b, href, cta], i) => (
              <div key={t} className="flex items-center gap-4 border-t border-line-soft px-6 py-5 first:border-t-0">
                <span className="flex size-10 flex-none items-center justify-center rounded-full bg-sage font-display text-lg text-forest">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <b className="block">{t}</b>
                  <span className="text-[13.5px] text-muted">{b}</span>
                </div>
                <ButtonLink href={href} size="sm" variant={i === 0 ? "primary" : "secondary"}>
                  {cta}
                </ButtonLink>
              </div>
            ))}
          </Card>
          <div className="flex flex-col gap-4">
            <Card>
              <Eyebrow>Next visit</Eyebrow>
              <div className="mt-1.5 font-display text-2xl">No visits yet</div>
              <p className="text-sm text-body">Book your intro call to begin.</p>
            </Card>
            <Card>
              <Eyebrow>Messages</Eyebrow>
              <div className="mt-1.5 font-display text-2xl">Included with membership</div>
              <p className="text-sm text-body">Members message Dr. Oparaji between visits. Pay-per-visit patients can message for 14 days after a visit.</p>
            </Card>
            <Card>
              <Eyebrow>Plan</Eyebrow>
              <div className="mt-1.5 font-display text-2xl">Pay per visit</div>
              <p className="text-sm text-body">
                Intro call is free. Follow-ups are {followUp ? moneyShort(followUp.priceCents) : "$95"}. Plans from {connect ? moneyShort(connect.monthlyPriceCents) : "$59"}/mo.
              </p>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const used = membership ? await allowanceUsed(membership, new Date()) : 0;
  const reservedFor = membership
    ? await db.appointment.findFirst({ where: { membershipId: membership.id, usesAllowance: true, status: "SCHEDULED", startsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" } })
    : null;
  const room = next ? roomWindow(next) : null;
  const firstW = weights[0];
  const lastW = weights[weights.length - 1];

  return (
    <div className="mx-auto max-w-[1140px]">
      <h1 className="h-display text-[34px] md:text-[38px]">
        {greeting(tz)}, {firstName(user.name)}
      </h1>
      <p className="mt-1.5 text-[15.5px] text-body">Your care at a glance.</p>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        {next ? (
          <div className="relative overflow-hidden rounded-[20px] bg-forest p-6 text-white md:p-7">
            <div aria-hidden className="absolute -right-10 -top-10 size-44 rounded-full bg-forest-deep" />
            <div className="relative flex flex-wrap items-center gap-2">
              <span className="text-[12px] font-extrabold uppercase tracking-[.14em] text-white/80">Next visit</span>
              <span className="rounded-full bg-gold px-2.5 py-1 text-[12px] font-bold text-ink">{priceLabel(next)}</span>
            </div>
            <div className="relative mt-2 font-display text-[30px] leading-tight md:text-[34px]">
              {next.visitType.name} · {fmt(next.startsAt, tz, "EEE d MMM")}
            </div>
            <div className="relative mt-1 text-white/85">
              {fmtTime(next.startsAt, tz)} {zoneAbbr(tz, next.startsAt)} · {fmtTime(next.startsAt, PRACTICE_TZ)} Houston · {next.visitType.durationMin} min
            </div>
            <div className="relative mt-5 flex flex-wrap items-center gap-3">
              {next.status === "PENDING_PAYMENT" ? (
                <Link href={`/portal/visits/${next.id}/pay`} className="rounded-full bg-gold px-6 py-3 font-bold text-ink">
                  Pay {money(next.priceCents)} to confirm
                </Link>
              ) : (
                <Link href={`/portal/visits/${next.id}/precheck`} className="rounded-full bg-gold px-6 py-3 font-bold text-ink">
                  Join video visit
                </Link>
              )}
              <a href={`/api/visits/${next.id}/ics`} className="rounded-full border-[1.5px] border-white/60 px-6 py-3 font-bold">
                Add to calendar
              </a>
              <span className="text-[13px] text-white/75">{room?.isOpen ? "Room is open now" : "Room opens 15 minutes before"}</span>
            </div>
          </div>
        ) : (
          <Card className="flex flex-col justify-center">
            <Eyebrow>Next visit</Eyebrow>
            <div className="mt-1.5 font-display text-[28px]">No upcoming visits</div>
            <p className="text-sm text-body">Book your next visit when you are ready.</p>
            <div className="mt-4">
              <ButtonLink href="/portal/book">Book a visit</ButtonLink>
            </div>
          </Card>
        )}

        <Card>
          <Eyebrow>Membership</Eyebrow>
          {membership ? (
            <>
              <div className="mt-1.5 font-display text-2xl">
                {membership.plan.name} · {moneyShort(membership.plan.monthlyPriceCents)}/mo
              </div>
              {membership.plan.includedVisits > 0 ? (
                <>
                  <p className="text-sm text-body">
                    {membership.plan.includedLabel ?? `${membership.plan.includedVisits} visits`} included{reservedFor ? `, reserved for ${fmtShort(reservedFor.startsAt, tz)}` : ""}
                  </p>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-line-soft">
                    <div className="h-full rounded-full bg-forest" style={{ width: `${Math.min(100, (used / membership.plan.includedVisits) * 100)}%` }} />
                  </div>
                  <div className="mt-2 text-[13px] text-muted">
                    {used} of {membership.plan.includedVisits} used · resets {fmtShort(membership.currentPeriodEnd, tz)}
                  </div>
                </>
              ) : (
                <p className="text-sm text-body">Messaging all month and {membership.plan.discountPct}% off every visit.</p>
              )}
            </>
          ) : (
            <>
              <div className="mt-1.5 font-display text-2xl">Pay per visit</div>
              <p className="text-sm text-body">Join a plan for included visits and messaging.</p>
              <Link href="/membership" className="mt-3 inline-block text-sm font-bold text-forest">
                See membership plans →
              </Link>
            </>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <Eyebrow>Messages</Eyebrow>
            {unread > 0 && <Tag tone="coral">{unread} unread</Tag>}
          </div>
          {access.open ? (
            <>
              <p className="mt-2 font-display text-xl">{lastMsg ? `“${lastMsg.body}”` : "No messages yet."}</p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <ButtonLink href="/portal/messages" variant="secondary" size="sm">
                  Open messages
                </ButtonLink>
                <span className="text-[12.5px] text-muted">Not for emergencies. Replies within 1 business day.</span>
              </div>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm text-body">Messaging is a member benefit. Pay-per-visit patients can message for 14 days after a visit.</p>
              <Link href="/portal/messages" className="mt-3 inline-block text-sm font-bold text-forest">
                See options →
              </Link>
            </>
          )}
        </Card>

        <Card className={prof.pct < 100 ? "bg-gold-tint !border-gold-line" : ""}>
          <Eyebrow className={prof.pct < 100 ? "!text-gold-ink" : ""}>Health profile</Eyebrow>
          {prof.pct < 100 ? (
            <>
              <p className="mt-2 text-[15px]">
                {!profile?.emergencyContact?.name ? "Add your emergency contact so Dr. Oparaji is ready." : `${prof.done} of ${prof.total} sections done.`}
              </p>
              <div className="mt-4">
                <ButtonLink href="/portal/health-profile" size="sm">
                  Complete profile
                </ButtonLink>
              </div>
            </>
          ) : (
            <p className="mt-2 text-[15px]">Your profile is complete. Thank you.</p>
          )}
        </Card>

        <Card>
          <div className="mb-2 flex items-center justify-between">
            <Eyebrow>Care plans</Eyebrow>
            <Link href="/portal/visits?tab=past" className="text-[13px] font-bold text-forest">
              All visits →
            </Link>
          </div>
          {plans.length === 0 && <p className="text-sm text-body">Your first care plan appears here after your consultation.</p>}
          {plans.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 border-t border-line-soft py-3 first:border-t-0">
              <div>
                <b className="block text-[15px]">
                  {p.appointment.visitType.name} · {fmtShort(p.appointment.startsAt, tz)}
                </b>
                <span className="text-[13px] text-muted">Published by Dr. Oparaji</span>
              </div>
              <ButtonLink href={`/portal/care-plans/${p.id}`} size="sm" variant="secondary">
                View plan
              </ButtonLink>
            </div>
          ))}
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <Eyebrow>Weight</Eyebrow>
            <Link href="/portal/progress" className="text-[13px] font-bold text-forest">
              Progress →
            </Link>
          </div>
          {lastW ? (
            <div className="mt-2 flex items-baseline gap-3">
              <span className="font-display text-[40px]">{lastW.value?.toFixed(1)} kg</span>
              {firstW && firstW !== lastW && (
                <span className="text-sm font-bold text-success">
                  {((lastW.value ?? 0) - (firstW.value ?? 0)).toFixed(1).replace("-", "−")} kg since {fmtShort(firstW.takenAt, tz)}
                </span>
              )}
            </div>
          ) : (
            <p className="mt-2 text-sm text-body">Log your first weight on the Progress page.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
