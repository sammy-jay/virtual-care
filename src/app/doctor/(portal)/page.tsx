import Link from "next/link";
import type { Metadata } from "next";
import { Icon, type IconName } from "@/components/icons";
import { Alert, Avatar, ButtonLink, Card, Eyebrow } from "@/components/ui";
import { requireDoctor } from "@/lib/auth/dal";
import { unreadForDoctor } from "@/lib/care";
import { db } from "@/lib/db";
import { initials, money, pluralize, shortName } from "@/lib/format";
import { dayKey, fmt, fmtTime, greeting, PRACTICE_TZ, zoneAbbr, zonedWallToUtc, nowMs } from "@/lib/time";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DoctorDashboard({ searchParams }: PageProps<"/doctor">) {
  await requireDoctor();
  const sp = await searchParams;
  const tz = PRACTICE_TZ;
  const today = dayKey(new Date(), tz);
  const dayStart = zonedWallToUtc(today, 0, tz);
  const dayEnd = zonedWallToUtc(today, 24 * 60, tz);
  const monthStart = zonedWallToUtc(fmt(new Date(), tz, "yyyy-MM-01"), 0, tz);

  const [todays, monthPayments, monthVisits, members, newMembers, unread, oldestUnread, drafts, inquiries, dataReq] = await Promise.all([
    db.appointment.findMany({
      where: { startsAt: { gte: dayStart, lt: dayEnd }, status: { in: ["SCHEDULED", "COMPLETED", "NO_SHOW"] } },
      include: { patient: true, visitType: true, membership: { include: { plan: true } } },
      orderBy: { startsAt: "asc" },
    }),
    db.payment.findMany({ where: { createdAt: { gte: monthStart }, status: { in: ["PAID", "PARTIALLY_REFUNDED"] } } }),
    db.appointment.count({ where: { startsAt: { gte: monthStart, lt: new Date() }, status: "COMPLETED" } }),
    db.membership.count({ where: { status: { in: ["ACTIVE", "PAST_DUE"] } } }),
    db.membership.count({ where: { status: "ACTIVE", createdAt: { gte: monthStart } } }),
    unreadForDoctor(),
    db.message.findFirst({ where: { fromDoctor: false, readAt: null }, orderBy: { createdAt: "asc" } }),
    db.carePlan.findMany({ where: { status: "DRAFT", appointment: { status: "COMPLETED" } }, include: { patient: true }, take: 5 }),
    db.inquiry.count({ where: { status: "NEW" } }),
    db.dataRequest.findFirst({ where: { status: "OPEN" }, orderBy: { dueAt: "asc" } }),
  ]);
  const gross = monthPayments.reduce((s, p) => s + p.amountCents - p.refundedCents, 0);
  const next = todays.find((a) => a.status === "SCHEDULED" && a.endsAt > new Date());
  const paidOrIncluded = todays.filter((a) => a.pricingReason === "INCLUDED" || a.priceCents > 0).length;

  const billLine = (a: (typeof todays)[number]) =>
    a.pricingReason === "INCLUDED"
      ? `${a.membership?.plan.name ?? "Plan"} · included`
      : a.pricingReason === "FREE"
        ? "Free"
        : a.pricingReason === "MEMBER_RATE"
          ? `${a.membership?.plan.name ?? "Member"} · ${money(a.priceCents)}`
          : `Paid ${money(a.priceCents)}`;

  const attention: [IconName, string, string, string][] = [
    drafts.length ? ["doc", `${pluralize(drafts.length, "care plan")} to publish`, drafts.map((d) => shortName(d.patient.name)).join(", "), `/doctor/care-plans/${drafts[0].id}`] : null,
    unread ? ["chat", `${unread} unread message${unread === 1 ? "" : "s"}`, oldestUnread ? `Oldest waiting ${Math.max(1, Math.round((nowMs() - oldestUnread.createdAt.getTime()) / 3600_000))} hours` : "", "/doctor/messages"] : null,
    inquiries ? ["mail", `${inquiries} new inquir${inquiries === 1 ? "y" : "ies"}`, "Website contact form", "/doctor/inquiries"] : null,
    dataReq ? ["shield", "1 data request", `Due in ${Math.max(0, Math.ceil((dataReq.dueAt.getTime() - nowMs()) / 86400_000))} days`, "/doctor/settings/data-requests"] : null,
  ].filter(Boolean) as [IconName, string, string, string][];

  return (
    <div className="mx-auto max-w-[1140px]">
      {sp.published === "1" && (
        <Alert tone="success" className="mb-4">
          Care plan published. The patient was emailed.
        </Alert>
      )}
      <h1 className="h-display text-[34px] md:text-[38px]">{greeting(tz)}, Dr. Oparaji</h1>
      <p className="mt-1.5 text-[15.5px] text-body">
        {pluralize(todays.filter((a) => a.status === "SCHEDULED").length, "visit")} today.
        {next ? ` Your next starts at ${fmtTime(next.startsAt, tz)} ${zoneAbbr(tz, next.startsAt)}.` : " Nothing else scheduled."}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          ["Visits today", String(todays.length), `${paidOrIncluded} paid or included`],
          ["This month", money(gross, "USD", { compact: true }).replace(/\.\d+$/, ""), `${monthVisits} visits · ${members} members`],
          ["Unread", String(unread), "Messages from patients"],
          ["Members", String(members), `+${newMembers} this month`],
        ].map(([l, v, s]) => (
          <Card key={l}>
            <Eyebrow>{l}</Eyebrow>
            <div className="mt-1.5 font-display text-[36px] leading-none">{v}</div>
            <div className="mt-1.5 text-[13px] text-muted">{s}</div>
          </Card>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Card className="!p-0">
          <div className="flex items-center justify-between px-6 pb-2 pt-5">
            <b className="font-display text-[22px] font-normal">Today · {fmt(new Date(), tz, "EEE d MMM")}</b>
            <Link href="/doctor/appointments" className="text-[13px] font-bold text-forest">
              Full calendar →
            </Link>
          </div>
          {todays.length === 0 && <p className="px-6 pb-6 text-sm text-body">No visits today.</p>}
          {todays.map((a) => {
            const prospective = a.visitType.alwaysFree;
            return (
              <div key={a.id} className="flex items-center gap-4 border-t border-line-soft px-6 py-4">
                <div className="w-16 flex-none text-right">
                  <b className="block text-[15px]">{fmtTime(a.startsAt, tz)}</b>
                  <span className="text-[12px] text-muted">{zoneAbbr(tz, a.startsAt)}</span>
                </div>
                <Avatar initials={prospective ? "IC" : initials(a.patient?.name ?? "?")} tone={prospective ? "gold" : "sage"} />
                <div className="min-w-0 flex-1">
                  <b className="block truncate">{prospective ? "Intro call" : a.patient?.name}</b>
                  <span className="text-[13px] text-muted">
                    {prospective ? `${a.patient ? shortName(a.patient.name) : "Prospective patient"} · ` : `${a.visitType.name} · `}
                    {a.visitType.durationMin} min
                  </span>
                </div>
                <span className="hidden text-[13px] font-semibold text-body sm:block">{billLine(a)}</span>
                <ButtonLink href={a.status === "SCHEDULED" ? `/doctor/visits/${a.id}/waiting` : `/doctor/patients/${a.patientId}`} size="sm" variant="secondary">
                  Open
                </ButtonLink>
              </div>
            );
          })}
        </Card>
        <Card>
          <b className="font-display text-[22px] font-normal">Needs your attention</b>
          {attention.length === 0 && <p className="mt-3 text-sm text-body">All caught up.</p>}
          {attention.map(([icon, t, b, href]) => (
            <Link key={t} href={href} className="flex items-center gap-3 border-t border-line-soft py-3.5 first-of-type:mt-2">
              <span className="flex size-10 flex-none items-center justify-center rounded-xl bg-gold-tint text-gold-ink">
                <Icon name={icon} size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <b className="block text-[15px]">{t}</b>
                <span className="text-[13px] text-muted">{b}</span>
              </span>
              <Icon name="chevronRight" size={16} className="text-muted" />
            </Link>
          ))}
        </Card>
      </div>
    </div>
  );
}
