import Link from "@/components/market";
import type { Metadata } from "next";
import { Modal, ModalActions, ModalSummary } from "@/components/modal";
import { Icon } from "@/components/icons";
import { Alert, Button, ButtonLink, Card, Eyebrow, PageTitle, Row } from "@/components/ui";
import { requirePatient } from "@/lib/auth/dal";
import { allowanceUsed, getActiveMembership, getPlans, getVisitTypes } from "@/lib/care";
import { db } from "@/lib/db";
import { cn, money, moneyShort } from "@/lib/format";
import { prorate } from "@/lib/pricing";
import { fmtShort } from "@/lib/time";
import { cancelMembership, resumeMembership, switchPlan } from "../billing/actions";

export const metadata: Metadata = { title: "Membership" };

export default async function PatientMembershipPage({ searchParams }: PageProps<"/portal/membership">) {
  const user = await requirePatient();
  const sp = await searchParams;
  const tz = user.timeZone;
  const [m, plans, payments, types] = await Promise.all([
    getActiveMembership(user.id),
    getPlans(),
    db.payment.findMany({ where: { patientId: user.id, amountCents: { gt: 0 } }, orderBy: { createdAt: "desc" }, take: 3 }),
    getVisitTypes(),
  ]);
  const used = m ? await allowanceUsed(m, new Date()) : 0;
  const reserved = m
    ? await db.appointment.findFirst({ where: { membershipId: m.id, usesAllowance: true, status: "SCHEDULED", startsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" } })
    : null;
  const pm = m?.paymentMethodId ? await db.paymentMethod.findUnique({ where: { id: m.paymentMethodId } }) : null;
  const dialog = typeof sp.dialog === "string" ? sp.dialog : null;
  const target = plans.find((p) => p.slug === sp.plan);
  const price = (p: (typeof plans)[number]) => (m?.currency === "NGN" ? p.monthlyPriceNgn * 100 : p.monthlyPriceCents);
  const cur = m?.currency ?? "USD";
  const followUp = types.find((t) => t.slug === "follow-up");
  const switchable = m ? plans.filter((p) => p.id !== m.planId) : [];

  const PlanCard = ({ p }: { p: (typeof plans)[number] }) => {
    const mine = m?.planId === p.id;
    return (
      <div className={cn("flex flex-col rounded-[20px] border bg-white p-6", mine ? "border-2 border-forest" : "border-line")}>
        <div className="flex items-center justify-between">
          <b className="font-display text-2xl font-normal">{p.name}</b>
          {mine && <span className="rounded-full bg-forest px-2.5 py-1 text-[12px] font-bold text-white">Your plan</span>}
        </div>
        <div className="text-[13.5px] text-muted">{p.tagline}</div>
        <div className="my-4 font-display text-[40px] leading-none">
          {moneyShort(price(p), cur)}
          <span className="font-sans text-sm text-muted"> /mo</span>
        </div>
        <ul className="flex flex-1 flex-col gap-2 text-[14.5px]">
          {[p.includedVisits ? `${p.includedLabel ?? p.includedVisits + " visits"} included monthly` : "No included visits", "Secure messaging all month", `${p.discountPct}% off ${p.includedVisits ? "extra" : "every"} visit${p.includedVisits ? "s" : ""}`].map((f) => (
            <li key={f} className="flex gap-2">
              <Icon name="check" size={17} strokeWidth={2.4} className="mt-0.5 text-forest" />
              {f}
            </li>
          ))}
        </ul>
        {!mine && (
          <ButtonLink href={m ? `/portal/membership?dialog=switch&plan=${p.slug}` : `/portal/checkout?plan=${p.slug}`} variant="secondary" className="mt-5">
            {m ? `Switch to ${p.name}` : `Join ${p.name}`}
          </ButtonLink>
        )}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-[1140px]">
      <PageTitle title="Membership" subtitle="One monthly price covers your included visit and messaging." />
      {sp.refunded === "1" && <Alert tone="info" className="mb-4">You already had an active membership, so we refunded that payment in full.</Alert>}
      {typeof sp.error === "string" && <Alert tone="error" className="mb-4">{sp.error}</Alert>}
      {sp.joined === "1" && <Alert tone="success" className="mb-4">Welcome to {m?.plan.name}. Your included visits are ready to book.</Alert>}
      {sp.switched === "1" && <Alert tone="success" className="mb-4">Your plan was switched to {m?.plan.name}.</Alert>}
      {sp.cancelled === "1" && <Alert tone="info" className="mb-4">Your membership will end on {m && fmtShort(m.currentPeriodEnd, tz)}. You keep everything until then.</Alert>}
      {m?.status === "PAST_DUE" && (
        <Alert tone="error" className="mb-4">
          Your last payment did not go through. Your plan stays active until {m.graceUntil ? fmtShort(m.graceUntil, tz) : "soon"} while you <Link href="/portal/settings/payment-methods" className="underline">update your card</Link>.
        </Alert>
      )}

      {m ? (
        <Card className="mb-5">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <Eyebrow>Your plan</Eyebrow>
              <div className="mt-1.5 font-display text-[30px]">
                {m.plan.name} · {moneyShort(price(m.plan), cur)}/mo
              </div>
              <div className="text-sm text-body">
                {m.cancelAtPeriodEnd ? "Ends" : "Renews"} {fmtShort(m.currentPeriodEnd, tz)}
                {pm ? ` · Card ending ${pm.last4}` : ""}
              </div>
            </div>
            {m.plan.includedVisits > 0 && (
              <div className="min-w-[260px] rounded-2xl bg-sage p-4">
                <div className="flex justify-between text-sm">
                  <b>Included {m.plan.includedVisits === 1 ? "follow-up" : "visits"}</b>
                  <span>
                    {used} of {m.plan.includedVisits} {reserved ? "reserved" : "used"}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                  <div className="h-full rounded-full bg-forest" style={{ width: `${(used / m.plan.includedVisits) * 100}%` }} />
                </div>
                <div className="mt-2 text-[13px] text-sage-ink">
                  {reserved ? `Reserved for ${fmtShort(reserved.startsAt, tz)}. ` : ""}Resets {fmtShort(m.currentPeriodEnd, tz)}.
                </div>
              </div>
            )}
          </div>
          <p className="mt-4 text-sm text-muted">Extra visits are charged at your {m.plan.discountPct}% member rate.</p>
        </Card>
      ) : (
        <Alert tone="info" className="mb-5">
          You pay per visit today. Members get {plans.length === 1 && plans[0].includedVisits ? `${plans[0].includedLabel ?? "a visit"} included each month` : "included visits"}, messaging all month and member pricing.
        </Alert>
      )}

      {/* Hidden when the member is already on the only plan on sale: the card above says it all. */}
      {switchable.length > 0 || !m ? (
        <div id="plans" className={cn("grid scroll-mt-24 gap-4", plans.length === 1 ? "max-w-[440px]" : "md:grid-cols-3")}>
          {plans.map((p) => (
            <PlanCard key={p.id} p={p} />
          ))}
        </div>
      ) : null}

      <Card className="mt-5">
        <div className="mb-1 flex items-center justify-between">
          <Eyebrow>Recent payments</Eyebrow>
          <Link href="/portal/billing" className="text-[13px] font-bold text-forest">
            All receipts →
          </Link>
        </div>
        {payments.length === 0 && <p className="py-3 text-sm text-body">No payments yet.</p>}
        {payments.map((p) => (
          <Row key={p.id} label={`${fmtShort(p.createdAt, tz)} · ${p.description}${p.note && p.kind === "VISIT" && /before/i.test(p.note) ? ` (${p.note.toLowerCase()})` : ""}`}>
            {money(p.amountCents, p.currency)}
          </Row>
        ))}
      </Card>

      {m && (
        <div className="mt-5 flex flex-wrap gap-3">
          {switchable.length > 0 && (
            <ButtonLink href="#plans" variant="secondary">
              Change plan
            </ButtonLink>
          )}
          {m.cancelAtPeriodEnd ? (
            <form action={resumeMembership}>
              <Button>Keep {m.plan.name}</Button>
            </form>
          ) : (
            <ButtonLink href="/portal/membership?dialog=cancel" variant="ghost" className="!text-danger">
              Cancel membership
            </ButtonLink>
          )}
        </div>
      )}

      {dialog === "switch" && m && target && (
        <Modal closeHref="/portal/membership" title={`Switch to ${target.name}?`} subtitle="Your included visits and price change from today.">
          {(() => {
            const { amountCents, daysLeft } = prorate(price(m.plan), price(target), m.currentPeriodStart, m.currentPeriodEnd);
            return (
              <>
                <ModalSummary>
                  <Row label="From">
                    {m.plan.name} · {moneyShort(price(m.plan), cur)}/mo
                  </Row>
                  <Row label="To">
                    {target.name} · {moneyShort(price(target), cur)}/mo
                  </Row>
                  <Row label="Included visits">
                    {m.plan.includedVisits} → {target.includedVisits} per month
                  </Row>
                  <Row label="Charged today (prorated)">{money(amountCents, cur)}</Row>
                </ModalSummary>
                <p className="mt-3 text-sm text-body">
                  {amountCents > 0 ? `Prorated for ${daysLeft} days left in this period. ` : "Lower plans take effect today with no refund for the current period. "}
                  Next charge {fmtShort(m.currentPeriodEnd, tz)}: {money(price(target), cur)}.{reserved ? ` Your reserved ${fmtShort(reserved.startsAt, tz)} visit is kept.` : ""}
                </p>
                <form action={switchPlan}>
                  <input type="hidden" name="plan" value={target.slug} />
                  <ModalActions>
                    <ButtonLink href="/portal/membership" variant="secondary">
                      Keep {m.plan.name}
                    </ButtonLink>
                    <Button>Switch plan</Button>
                  </ModalActions>
                </form>
              </>
            );
          })()}
        </Modal>
      )}

      {dialog === "cancel" && m && (
        <Modal closeHref="/portal/membership" title={`Cancel ${m.plan.name}?`} subtitle={`You keep everything until ${fmtShort(m.currentPeriodEnd, tz)}.`} icon="card" iconTone="coral">
          <ul className="flex flex-col gap-2.5 text-[15px]">
            {[
              reserved ? `Your reserved visit on ${fmtShort(reserved.startsAt, tz)} stays included` : "Book any included visit before the period ends",
              `Messaging stays open until ${fmtShort(m.currentPeriodEnd, tz)}, then 14 days after your last visit`,
              `After ${fmtShort(m.currentPeriodEnd, tz)}, visits are ${followUp ? moneyShort(followUp.priceCents) : "standard price"} and the ${m.plan.discountPct}% member rate ends`,
            ].map((t) => (
              <li key={t} className="flex gap-2.5">
                <Icon name="check" size={18} strokeWidth={2.4} className="mt-0.5 text-forest" />
                {t}
              </li>
            ))}
          </ul>
          <form action={cancelMembership}>
            <ModalActions>
              <ButtonLink href="/portal/membership" variant="secondary">
                Keep {m.plan.name}
              </ButtonLink>
              <Button variant="danger">Cancel membership</Button>
            </ModalActions>
          </form>
        </Modal>
      )}
    </div>
  );
}
