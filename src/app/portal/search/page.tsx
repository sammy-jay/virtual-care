import Link from "@/components/market";
import type { Metadata } from "next";
import { Card, EmptyState, PageTitle, StatusTag } from "@/components/ui";
import { requirePatient } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { fmtShort } from "@/lib/time";

export const metadata: Metadata = { title: "Search" };

export default async function PatientSearchPage({ searchParams }: PageProps<"/portal/search">) {
  const user = await requirePatient();
  const { q } = await searchParams;
  const term = typeof q === "string" ? q.trim() : "";
  const rx = { contains: term, mode: "insensitive" as const };
  const [visits, messages, plans] = term
    ? await Promise.all([
        db.appointment.findMany({ where: { patientId: user.id, OR: [{ reason: rx }, { visitType: { name: rx } }] }, include: { visitType: true }, take: 10, orderBy: { startsAt: "desc" } }),
        db.message.findMany({ where: { conversation: { patientId: user.id }, body: rx }, take: 10, orderBy: { createdAt: "desc" } }),
        db.carePlan.findMany({ where: { patientId: user.id, status: "PUBLISHED", OR: [{ summary: rx }, { goals: { has: term } }] }, include: { appointment: { include: { visitType: true } } }, take: 10 }),
      ])
    : [[], [], []];
  const total = visits.length + messages.length + plans.length;
  return (
    <div className="mx-auto max-w-[900px]">
      <PageTitle title="Search" />
      <form className="mb-5">
        <label htmlFor="q" className="sr-only">
          Search
        </label>
        <input id="q" name="q" defaultValue={term} autoFocus placeholder="Search visits, messages, care plans" className="field !rounded-full" />
      </form>
      {term && total === 0 && <EmptyState icon="search" title="No results" body="Try a different search." />}
      {visits.length > 0 && (
        <Card className="mb-4">
          <b>Visits</b>
          {visits.map((a) => (
            <Link key={a.id} href={`/portal/visits?id=${a.id}&tab=${a.startsAt > new Date() ? "upcoming" : "past"}`} className="flex items-center justify-between border-t border-line-soft py-3 first-of-type:mt-2">
              <span>
                {a.visitType.name} · {fmtShort(a.startsAt, user.timeZone)}
              </span>
              <StatusTag status={a.status} />
            </Link>
          ))}
        </Card>
      )}
      {plans.length > 0 && (
        <Card className="mb-4">
          <b>Care plans</b>
          {plans.map((p) => (
            <Link key={p.id} href={`/portal/care-plans/${p.id}`} className="block border-t border-line-soft py-3 first-of-type:mt-2">
              {p.appointment.visitType.name} plan · {fmtShort(p.appointment.startsAt, user.timeZone)}
            </Link>
          ))}
        </Card>
      )}
      {messages.length > 0 && (
        <Card>
          <b>Messages</b>
          {messages.map((m) => (
            <Link key={m.id} href={`/portal/messages?c=${m.conversationId}`} className="block border-t border-line-soft py-3 first-of-type:mt-2">
              <span className="block">“{m.body}”</span>
              <span className="text-[13px] text-muted">{fmtShort(m.createdAt, user.timeZone)}</span>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
