import Link from "@/components/market";
import type { Metadata } from "next";
import { HBar } from "@/components/charts";
import { Card, Eyebrow, PageTitle } from "@/components/ui";
import { requireDoctor } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { nowMs } from "@/lib/time";
import { cn } from "@/lib/format";

export const metadata: Metadata = { title: "Insights" };

const RANGES = { "30d": [30, "Last 30 days"], "90d": [90, "Last 90 days"], "12m": [365, "Last 12 months"] } as const;
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

export default async function InsightsPage({ searchParams }: PageProps<"/doctor/insights">) {
  await requireDoctor();
  const { range } = await searchParams;
  const key = (typeof range === "string" && range in RANGES ? range : "90d") as keyof typeof RANGES;
  const [days, label] = RANGES[key];
  const since = new Date(nowMs() - days * 86400_000);
  const prevSince = new Date(since.getTime() - days * 86400_000);

  const [visits, prevCount, patients, members, feedback, profiles, introPatients, paidAfter, oldMembers] = await Promise.all([
    db.appointment.findMany({ where: { startsAt: { gte: since, lt: new Date() }, status: { in: ["COMPLETED", "NO_SHOW"] } }, include: { visitType: true } }),
    db.appointment.count({ where: { startsAt: { gte: prevSince, lt: since }, status: { in: ["COMPLETED", "NO_SHOW"] } } }),
    db.user.count({ where: { role: "PATIENT", deletedAt: null } }),
    db.membership.count({ where: { status: { in: ["ACTIVE", "PAST_DUE"] } } }),
    db.feedback.findMany({ where: { createdAt: { gte: since } } }),
    db.patientProfile.findMany({ where: { user: { role: "PATIENT", deletedAt: null } }, select: { city: true } }),
    db.appointment.findMany({ where: { visitType: { alwaysFree: true }, status: "COMPLETED" }, select: { patientId: true }, distinct: ["patientId"] }),
    db.appointment.findMany({ where: { visitType: { alwaysFree: false }, status: { in: ["COMPLETED", "SCHEDULED"] } }, select: { patientId: true }, distinct: ["patientId"] }),
    db.membership.findMany({ where: { createdAt: { lte: new Date(nowMs() - 90 * 86400_000) } }, select: { status: true, cancelAtPeriodEnd: true } }),
  ]);
  const noShows = visits.filter((v) => v.status === "NO_SHOW").length;
  const change = prevCount ? Math.round(((visits.length - prevCount) / prevCount) * 100) : 0;
  const rating = feedback.length ? (feedback.reduce((s, f) => s + f.rating, 0) / feedback.length).toFixed(1) : "—";
  const byType = Object.entries(visits.reduce<Record<string, number>>((m, v) => ((m[v.visitType.name] = (m[v.visitType.name] ?? 0) + 1), m), {})).sort((a, b) => b[1] - a[1]);
  const cities = profiles.reduce<Record<string, number>>((m, p) => ((m[p.city ?? "Other"] = (m[p.city ?? "Other"] ?? 0) + 1), m), {});
  const top = Object.entries(cities).sort((a, b) => b[1] - a[1]);
  const shown = top.slice(0, 3);
  const other = top.slice(3).reduce((s, [, n]) => s + n, 0);
  const introSet = new Set(introPatients.map((i) => i.patientId));
  const converted = paidAfter.filter((p) => introSet.has(p.patientId)).length;
  const paidSet = new Set(paidAfter.map((p) => p.patientId));
  const retained = oldMembers.filter((m) => m.status !== "CANCELED" && !m.cancelAtPeriodEnd).length;

  return (
    <div className="mx-auto max-w-[1140px]">
      <PageTitle
        title="Insights"
        subtitle={label}
        actions={
          <div className="flex gap-1 rounded-full bg-white p-1">
            {Object.entries(RANGES).map(([k, [, l]]) => (
              <Link key={k} href={`/doctor/insights?range=${k}`} className={cn("rounded-full px-4 py-1.5 text-sm font-bold", k === key ? "bg-forest text-white" : "text-body")}>
                {l.replace("Last ", "")}
              </Link>
            ))}
          </div>
        }
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          ["Visits", String(visits.length), `${change >= 0 ? "+" : ""}${change}% vs previous`],
          ["Member share", `${pct(members, patients)}%`, `${members} of ${patients} patients`],
          ["No-show rate", `${pct(noShows, visits.length)}%`, `${noShows} of ${visits.length} visits`],
          ["Rating", rating, `${feedback.length} post-visit reviews`],
        ].map(([l, v, s]) => (
          <Card key={l}>
            <Eyebrow>{l}</Eyebrow>
            <div className="mt-1.5 num font-display text-[36px] leading-none">{v}</div>
            <div className="mt-1.5 text-[13px] text-muted">{s}</div>
          </Card>
        ))}
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card>
          <b>Visits by type</b>
          <div className="mt-2">
            {byType.map(([name, n]) => (
              <HBar key={name} label={name} value={n} max={byType[0][1]} />
            ))}
          </div>
        </Card>
        <Card>
          <b>Where patients are</b>
          <div className="mt-2">
            {[...shown, ...(other ? ([["Other", other]] as [string, number][]) : [])].map(([city, n]) => (
              <HBar key={city} label={city} value={pct(n, profiles.length)} max={100} suffix="%" tone="bg-sky" />
            ))}
          </div>
        </Card>
        <Card>
          <b>Conversion</b>
          <div className="mt-2">
            <HBar label="Intro call to paid visit" value={pct(converted, introSet.size)} max={100} suffix="%" tone="bg-gold" />
            <HBar label="Paid visit to member" value={pct(members, paidSet.size)} max={100} suffix="%" tone="bg-gold" />
            <HBar label="Member retention (3 mo)" value={pct(retained, oldMembers.length || members)} max={100} suffix="%" tone="bg-gold" />
          </div>
        </Card>
      </div>
    </div>
  );
}
