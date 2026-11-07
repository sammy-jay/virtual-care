import type { Metadata } from "next";
import { ButtonLink, Card, EmptyState, PageTitle, Tag } from "@/components/ui";
import { requirePatient } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { fmtShort } from "@/lib/time";

export const metadata: Metadata = { title: "Care plans" };

export default async function CarePlansPage() {
  const user = await requirePatient();
  const tz = user.timeZone;
  const [plans, next] = await Promise.all([
    db.carePlan.findMany({ where: { patientId: user.id, status: "PUBLISHED" }, orderBy: { publishedAt: "desc" }, include: { appointment: { include: { visitType: true } } } }),
    db.appointment.findFirst({ where: { patientId: user.id, status: "SCHEDULED", startsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" } }),
  ]);
  return (
    <div className="mx-auto max-w-[900px]">
      <PageTitle title="Care plans" subtitle="Written by Dr. Oparaji after each visit." />
      {plans.length === 0 ? (
        <EmptyState icon="doc" title="No care plans yet" body="Your first plan appears here after your consultation. You will get an email." action={<ButtonLink href="/portal/book">Book a visit</ButtonLink>} />
      ) : (
        <Card className="!p-0">
          {plans.map((p, i) => (
            <div key={p.id} className="flex flex-wrap items-center gap-4 border-t border-line-soft px-6 py-5 first:border-t-0">
              <div className="min-w-0 flex-1">
                <b className="block text-[16px]">{p.appointment.visitType.name} plan</b>
                <span className="text-[13.5px] text-muted">
                  Published {fmtShort(p.publishedAt!, tz)}
                  {i === 0 ? " · goals, nutrition, next steps" : ""}
                </span>
              </div>
              <Tag tone={i === 0 ? "sage" : "gray"}>{i === 0 ? "Current" : "Past"}</Tag>
              <ButtonLink href={`/portal/care-plans/${p.id}`} size="sm" variant="secondary">
                Open
              </ButtonLink>
            </div>
          ))}
        </Card>
      )}
      {next && <p className="mt-4 rounded-2xl bg-sky-tint px-4 py-3 text-sm text-sky-ink">A new plan appears here after your {fmtShort(next.startsAt, tz)} visit. You will get an email.</p>}
    </div>
  );
}
