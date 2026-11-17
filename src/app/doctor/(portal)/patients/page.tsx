import Link from "@/components/market";
import type { Metadata } from "next";
import { Avatar, ButtonLink, Card, PageTitle } from "@/components/ui";
import { requireDoctor } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { cn, initials } from "@/lib/format";
import { fmt, PRACTICE_TZ, nowMs } from "@/lib/time";

export const metadata: Metadata = { title: "Patients" };

export default async function PatientsPage({ searchParams }: PageProps<"/doctor/patients">) {
  await requireDoctor();
  const sp = await searchParams;
  const filter = typeof sp.f === "string" ? sp.f : "all";
  const patients = await db.user.findMany({
    where: { role: "PATIENT", deletedAt: null },
    include: {
      profile: true,
      memberships: { where: { status: { in: ["ACTIVE", "PAST_DUE"] } }, include: { plan: true } },
      appointments: { where: { status: "SCHEDULED", startsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });
  const lastVisit = await db.appointment.groupBy({ by: ["patientId"], where: { status: "COMPLETED" }, _max: { startsAt: true } });
  const lastMap = new Map(lastVisit.map((l) => [l.patientId, l._max.startsAt]));
  const members = patients.filter((p) => p.memberships.length).length;
  const newCutoff = new Date(nowMs() - 30 * 86400_000);
  const list = patients.filter((p) => (filter === "members" ? p.memberships.length : filter === "ppv" ? !p.memberships.length : filter === "new" ? p.createdAt > newCutoff : true));
  return (
    <div className="mx-auto max-w-[1140px]">
      <PageTitle
        title="Patients"
        subtitle={`${patients.length} patients · ${members} members`}
        actions={
          <ButtonLink href="/api/doctor/patients.csv" variant="secondary" icon="download" prefetch={false}>
            Export list
          </ButtonLink>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {[["all", "All"], ["members", "Members"], ["ppv", "Pay per visit"], ["new", "New"]].map(([k, l]) => (
          <Link key={k} href={`/doctor/patients?f=${k}`} className={cn("rounded-full px-4 py-2 text-sm font-bold", filter === k ? "bg-forest text-white" : "bg-white text-body")}>
            {l}
          </Link>
        ))}
      </div>
      <Card className="overflow-x-auto !p-0">
        <table className="w-full min-w-[640px] text-left text-[14.5px]">
          <thead>
            <tr className="text-[11.5px] font-extrabold uppercase tracking-[.12em] text-muted">
              <th className="px-6 py-3">Patient</th>
              <th className="px-3 py-3">Plan</th>
              <th className="px-3 py-3">Location</th>
              <th className="px-3 py-3">Next visit</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody>
            {list.map((p) => {
              const next = p.appointments[0]?.startsAt ?? null;
              const last = lastMap.get(p.id);
              return (
                <tr key={p.id} className="border-t border-line-soft">
                  <td className="px-6 py-3.5">
                    <span className="flex items-center gap-3">
                      <Avatar initials={initials(p.name)} tone="sage" size={34} />
                      <b>{p.name}</b>
                    </span>
                  </td>
                  <td className="px-3">{p.memberships[0]?.plan.name ?? "Pay per visit"}</td>
                  <td className="px-3">
                    <span className="flex items-center gap-2">
                      <span title={p.market === "NG" ? "Nigeria site (/ng)" : "US site"} className={p.market === "NG" ? "rounded-md bg-gold-tint px-1.5 py-0.5 text-[11px] font-extrabold text-gold-ink" : "rounded-md bg-sky-tint px-1.5 py-0.5 text-[11px] font-extrabold text-sky-ink"}>
                        {p.market}
                      </span>
                      {p.profile?.city ?? "—"}
                    </span>
                  </td>
                  <td className="px-3">{next ? fmt(next, PRACTICE_TZ, "EEE d MMM") : last ? <span className="text-muted">Last {fmt(last, PRACTICE_TZ, "d MMM")}</span> : "—"}</td>
                  <td className="px-6 text-right">
                    <ButtonLink href={`/doctor/patients/${p.id}`} size="sm" variant="secondary">
                      Open
                    </ButtonLink>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
