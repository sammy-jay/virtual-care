import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Icon, type IconName } from "@/components/icons";
import { PrintButton } from "@/components/print-button";
import { ButtonLink, Card, Eyebrow } from "@/components/ui";
import { logAccess } from "@/lib/audit";
import { requirePatient } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { fmtShort, fmtWhen } from "@/lib/time";
import { priceLabel } from "@/lib/visit-labels";

export const metadata: Metadata = { title: "Care plan" };

export default async function CarePlanPage({ params }: PageProps<"/portal/care-plans/[id]">) {
  const user = await requirePatient();
  const { id } = await params;
  const plan = await db.carePlan.findUnique({ where: { id }, include: { appointment: { include: { visitType: true } } } });
  if (!plan || plan.patientId !== user.id || plan.status !== "PUBLISHED") notFound();
  const next = await db.appointment.findFirst({
    where: { patientId: user.id, status: "SCHEDULED", startsAt: { gte: new Date() } },
    orderBy: { startsAt: "asc" },
    include: { visitType: true, membership: { include: { plan: true } } },
  });
  await logAccess(user, `Viewed care plan · ${user.name}`, user.id);
  const tz = user.timeZone;
  const sections: [string, IconName, string, string[]][] = [
    ["Goals", "star", "bg-sage text-forest", plan.goals],
    ["Nutrition", "heart", "bg-gold-tint text-gold-ink", plan.nutrition],
    ["Movement and rest", "sparkle", "bg-sky-tint text-sky", plan.movement],
    ["Next steps", "check", "bg-coral-tint text-coral-ink", plan.nextSteps],
  ];
  return (
    <div className="mx-auto max-w-[1100px]">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="h-display text-[34px] md:text-[38px]">Care plan</h1>
          <p className="mt-1 text-[15.5px] text-body">
            {plan.appointment.visitType.name} · {fmtShort(plan.appointment.startsAt, tz)} · Published by Dr. Oparaji
          </p>
        </div>
        <div className="print:hidden">
          <PrintButton label="Save as PDF" />
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col gap-5">
          <Card>
            <Eyebrow>Summary</Eyebrow>
            <p className="mt-2 font-display text-[22px] leading-snug">{plan.summary}</p>
          </Card>
          <div className="grid gap-5 sm:grid-cols-2">
            {sections
              .filter(([, , , items]) => items.length)
              .map(([title, icon, tone, items]) => (
                <Card key={title}>
                  <div className="flex items-center gap-2.5">
                    <span className={`flex size-9 items-center justify-center rounded-xl ${tone}`}>
                      <Icon name={icon} size={17} />
                    </span>
                    <b className="text-[16px]">{title}</b>
                  </div>
                  <ul className="mt-3 flex flex-col gap-2 text-[15px]">
                    {items.map((t) => (
                      <li key={t} className="flex gap-2">
                        <span className="mt-2 size-1.5 flex-none rounded-full bg-forest" />
                        {t}
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
          </div>
        </div>
        {next && (
          <Card className="h-fit print:hidden">
            <Eyebrow>Next visit</Eyebrow>
            <div className="mt-1.5 font-display text-2xl">{fmtWhen(next.startsAt, tz)}</div>
            <p className="text-sm text-body">
              {next.visitType.name} · {next.visitType.durationMin} min · {priceLabel(next).replace(/ in .*/, "")}
            </p>
            <ButtonLink href={`/portal/visits?id=${next.id}`} variant="secondary" className="mt-4">
              View visit
            </ButtonLink>
          </Card>
        )}
      </div>
    </div>
  );
}
