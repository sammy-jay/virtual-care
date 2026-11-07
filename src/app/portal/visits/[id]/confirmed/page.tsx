import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Icon, type IconName } from "@/components/icons";
import { ButtonLink, Card, Row } from "@/components/ui";
import { requirePatient } from "@/lib/auth/dal";
import { allowanceUsed } from "@/lib/care";
import { db } from "@/lib/db";
import { profileSections } from "@/lib/profile";
import { fmtTime, fmtWhen, PRACTICE_TZ, zoneAbbr } from "@/lib/time";
import { priceLabel } from "@/lib/visit-labels";

export const metadata: Metadata = { title: "Booking confirmed" };

export default async function ConfirmedPage({ params }: PageProps<"/portal/visits/[id]/confirmed">) {
  const user = await requirePatient();
  const { id } = await params;
  const a = await db.appointment.findUnique({ where: { id }, include: { visitType: true, membership: { include: { plan: true } } } });
  if (!a || a.patientId !== user.id) notFound();
  if (a.status === "PENDING_PAYMENT") redirect(`/portal/visits/${a.id}/pay`);
  const profile = await db.patientProfile.findUnique({ where: { userId: user.id } });
  const pct = profileSections(user, profile).pct;
  const used = a.membership ? await allowanceUsed(a.membership, a.startsAt) : 0;

  const prep: [IconName, string, string, string?][] = [
    ["user", "Complete your health profile", `${pct}% done — takes 3 minutes`, pct < 100 ? "/portal/health-profile" : undefined],
    ["video", "Test your camera and microphone", "Room opens 15 minutes before", `/portal/visits/${a.id}/precheck`],
    ["lock", "Find a quiet, private place", "Visits are not recorded"],
  ];

  return (
    <div className="mx-auto max-w-[1000px]">
      <div className="mb-6 flex items-center gap-4">
        <span className="flex size-14 flex-none items-center justify-center rounded-[18px] bg-forest text-white">
          <Icon name="check" size={28} strokeWidth={2.2} />
        </span>
        <div>
          <h1 className="h-display text-[34px] md:text-[38px]">You are booked</h1>
          <p className="text-[15.5px] text-body">A confirmation was sent to your email.</p>
        </div>
      </div>
      <div className="grid gap-5 md:grid-cols-[1.2fr_1fr]">
        <Card>
          <div className="eyebrow">Your visit</div>
          <div className="mb-2 mt-1.5 font-display text-[26px]">
            {a.visitType.name} · {a.visitType.durationMin} min
          </div>
          <Row label="When">{fmtWhen(a.startsAt, user.timeZone)}</Row>
          <Row label="Doctor’s time">
            {fmtTime(a.startsAt, PRACTICE_TZ)} {zoneAbbr(PRACTICE_TZ, a.startsAt)} · Houston
          </Row>
          <Row label="Price">{priceLabel(a)}</Row>
          {a.usesAllowance && a.membership && (
            <Row label="Allowance">
              {used} of {a.membership.plan.includedVisits} {a.membership.plan.includedVisits === 1 ? "follow-up" : "visits"} used this month
            </Row>
          )}
          <div className="mt-5 flex flex-wrap gap-3">
            <ButtonLink href={`/api/visits/${a.id}/ics`} variant="secondary" icon="calendar" prefetch={false}>
              Add to calendar
            </ButtonLink>
            <ButtonLink href={`/portal/visits?id=${a.id}`}>View visit</ButtonLink>
          </div>
        </Card>
        <Card>
          <div className="eyebrow">Before your visit</div>
          <ul className="mt-3 flex flex-col">
            {prep.map(([icon, t, b, href]) => {
              const inner = (
                <>
                  <span className="flex size-10 flex-none items-center justify-center rounded-xl bg-sage text-forest">
                    <Icon name={icon} size={18} />
                  </span>
                  <span className="flex-1">
                    <b className="block text-[15px]">{t}</b>
                    <span className="text-[13px] text-muted">{b}</span>
                  </span>
                  {href && <Icon name="arrow" size={16} className="text-forest" />}
                </>
              );
              return (
                <li key={t} className="border-t border-line-soft first:border-t-0">
                  {href ? (
                    <Link href={href} className="flex items-center gap-3 py-3">
                      {inner}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3 py-3">{inner}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
      <p className="mt-5 rounded-2xl bg-sky-tint px-4 py-3 text-sm text-sky-ink">
        Need to change plans? Cancel free up to 12 hours before{a.usesAllowance ? " — your included visit returns to your allowance" : a.priceCents ? " — you are refunded automatically" : ""}.
      </p>
    </div>
  );
}
