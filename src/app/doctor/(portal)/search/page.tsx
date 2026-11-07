import Link from "next/link";
import type { Metadata } from "next";
import { Avatar, ButtonLink, Card, EmptyState, PageTitle, StatusTag } from "@/components/ui";
import { requireDoctor } from "@/lib/auth/dal";
import { getActiveMembership } from "@/lib/care";
import { db } from "@/lib/db";
import { cn, initials } from "@/lib/format";
import { fmt, PRACTICE_TZ } from "@/lib/time";

export const metadata: Metadata = { title: "Search" };

export default async function DoctorSearchPage({ searchParams }: PageProps<"/doctor/search">) {
  await requireDoctor();
  const sp = await searchParams;
  const term = typeof sp.q === "string" ? sp.q.trim() : "";
  const filter = typeof sp.f === "string" ? sp.f : "all";
  const rx = { contains: term, mode: "insensitive" as const };
  const [patients, visits, messages] = term
    ? await Promise.all([
        db.user.findMany({ where: { role: "PATIENT", deletedAt: null, OR: [{ name: rx }, { email: rx }, { phone: rx }] }, include: { profile: true }, take: 10 }),
        db.appointment.findMany({ where: { OR: [{ patient: { name: rx } }, { reason: rx }, { visitType: { name: rx } }] }, include: { visitType: true, patient: true, carePlan: true }, orderBy: { startsAt: "desc" }, take: 10 }),
        db.message.findMany({ where: { OR: [{ body: rx }, { conversation: { patient: { name: rx } } }] }, include: { conversation: { include: { patient: true } } }, orderBy: { createdAt: "desc" }, take: 10 }),
      ])
    : [[], [], []];
  const plans = await Promise.all(patients.map((p) => getActiveMembership(p.id)));
  const total = patients.length + visits.length + messages.length;
  const show = (k: string) => filter === "all" || filter === k;
  return (
    <div className="mx-auto max-w-[900px]">
      <PageTitle title="Search results" subtitle={term ? `“${term}” · ${total} result${total === 1 ? "" : "s"}` : "Search patients, visits, messages"} />
      <form className="mb-4">
        <label htmlFor="q" className="sr-only">Search</label>
        <input id="q" name="q" defaultValue={term} autoFocus placeholder="Search patients, visits, messages" className="field !rounded-full" />
      </form>
      {term && (
        <div className="mb-4 flex gap-2">
          {[["all", "All"], ["patients", "Patients"], ["visits", "Visits"], ["messages", "Messages"]].map(([k, l]) => (
            <Link key={k} href={`/doctor/search?q=${encodeURIComponent(term)}&f=${k}`} className={cn("rounded-full px-4 py-2 text-sm font-bold", filter === k ? "bg-forest text-white" : "bg-white text-body")}>
              {l}
            </Link>
          ))}
        </div>
      )}
      {term && total === 0 && <EmptyState icon="search" title="No results" body="Try a different search." />}
      {show("patients") && patients.length > 0 && (
        <Card className="mb-4">
          <b>Patients</b>
          {patients.map((p, i) => (
            <div key={p.id} className="flex items-center gap-3 border-t border-line-soft py-3 first-of-type:mt-2">
              <Avatar initials={initials(p.name)} tone="sage" />
              <div className="flex-1">
                <b className="block">{p.name}</b>
                <span className="text-[13px] text-muted">
                  {plans[i] ? `${plans[i]!.plan.name} member` : "Pay per visit"} · {p.profile?.city ?? "—"}
                </span>
              </div>
              <ButtonLink href={`/doctor/patients/${p.id}`} size="sm" variant="secondary">
                Open record
              </ButtonLink>
            </div>
          ))}
        </Card>
      )}
      {show("visits") && visits.length > 0 && (
        <Card className="mb-4">
          <b>Visits</b>
          {visits.map((a) => (
            <Link key={a.id} href={`/doctor/patients/${a.patientId}/visits`} className="flex items-center justify-between gap-3 border-t border-line-soft py-3 first-of-type:mt-2">
              <span>
                {a.patient?.name} · {a.visitType.name} · {fmt(a.startsAt, PRACTICE_TZ, "EEE d MMM")}
                {a.carePlan?.status === "PUBLISHED" ? " · Care plan published" : ""}
              </span>
              <StatusTag status={a.status} />
            </Link>
          ))}
        </Card>
      )}
      {show("messages") && messages.length > 0 && (
        <Card>
          <b>Messages</b>
          {messages.map((m) => (
            <Link key={m.id} href={`/doctor/messages?c=${m.conversationId}`} className="block border-t border-line-soft py-3 first-of-type:mt-2">
              <span className="block">
                {m.fromDoctor ? "You" : m.conversation.patient.name.split(" ")[0]}: “{m.body}”
              </span>
              <span className="text-[13px] text-muted">{fmt(m.createdAt, PRACTICE_TZ, "EEE h:mm a")}</span>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
