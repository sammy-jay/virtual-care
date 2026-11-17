import Link from "@/components/market";
import type { Metadata } from "next";
import { BarChart } from "@/components/charts";
import { RefundModal } from "@/components/doctor/refund-modal";
import { Modal, ModalActions } from "@/components/modal";
import { Alert, Button, ButtonLink, Card, Eyebrow, PageTitle } from "@/components/ui";
import { requireDoctor } from "@/lib/auth/dal";
import { getPractice } from "@/lib/care";
import { db } from "@/lib/db";
import { money } from "@/lib/format";
import { addMonths, fmt, fmtShort, PRACTICE_TZ, zonedWallToUtc } from "@/lib/time";
import { savePayout } from "../../actions";

export const metadata: Metadata = { title: "Earnings" };

const net = (p: { amountCents: number; refundedCents: number; currency: string }, ngnPerUsd: number) => {
  const c = p.amountCents - p.refundedCents;
  return p.currency === "NGN" ? Math.round(c / ngnPerUsd) : c;
};

export default async function EarningsPage({ searchParams }: PageProps<"/doctor/earnings">) {
  await requireDoctor();
  const sp = await searchParams;
  const tz = PRACTICE_TZ;
  const practice = await getPractice();
  const monthStart = zonedWallToUtc(fmt(new Date(), tz, "yyyy-MM-01"), 0, tz);
  const sixAgo = addMonths(monthStart, -5);
  const [payments, members, refunds, recent, visits] = await Promise.all([
    db.payment.findMany({ where: { createdAt: { gte: sixAgo }, status: { in: ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"] } } }),
    db.membership.findMany({ where: { status: { in: ["ACTIVE", "PAST_DUE"] } }, include: { plan: true } }),
    db.refund.findMany({ where: { createdAt: { gte: monthStart } } }),
    db.payment.findMany({ where: { amountCents: { gt: 0 }, status: { not: "FAILED" } }, orderBy: { createdAt: "desc" }, take: 8, include: { patient: true, paymentMethod: true } }),
    db.appointment.count({ where: { startsAt: { gte: monthStart, lt: new Date() }, status: "COMPLETED" } }),
  ]);
  const thisMonth = payments.filter((p) => p.createdAt >= monthStart);
  const gross = thisMonth.reduce((s, p) => s + net(p, practice.ngnPerUsd), 0);
  const mrr = members.reduce((s, m) => s + m.plan.monthlyPriceCents, 0);
  const refunded = refunds.reduce((s, r) => s + r.amountCents, 0);
  // Payout: weekly, on Friday; covers paid amounts since the last Friday.
  const d = new Date();
  const daysToFri = (5 - Number(fmt(d, tz, "i")) % 7 + 7) % 7 || 7;
  const nextFri = new Date(d.getTime() + daysToFri * 86400_000);
  const lastFri = new Date(nextFri.getTime() - 7 * 86400_000);
  const pending = payments.filter((p) => p.createdAt >= lastFri).reduce((s, p) => s + net(p, practice.ngnPerUsd), 0);
  const bars = Array.from({ length: 6 }, (_, i) => {
    const start = addMonths(sixAgo, i);
    const end = addMonths(sixAgo, i + 1);
    return { label: fmt(start, tz, "MMM"), value: payments.filter((p) => p.createdAt >= start && p.createdAt < end).reduce((s, p) => s + net(p, practice.ngnPerUsd), 0), highlight: i === 5 };
  });
  const refunding = typeof sp.refund === "string" ? await db.payment.findUnique({ where: { id: sp.refund }, include: { patient: true, paymentMethod: true } }) : null;

  return (
    <div className="mx-auto max-w-[1140px]">
      <PageTitle
        title="Earnings"
        subtitle={`${fmt(new Date(), tz, "MMMM yyyy")} · before processor fees`}
        actions={
          <ButtonLink href="/api/doctor/statement.csv" variant="secondary" icon="download" prefetch={false}>
            Download statement
          </ButtonLink>
        }
      />
      {sp.refunded === "1" && <Alert tone="success" className="mb-4">Refund issued. The patient was emailed.</Alert>}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <Eyebrow>Gross this month</Eyebrow>
          <div className="mt-1.5 num font-display text-[34px] leading-none">{money(gross, "USD", { compact: true }).split(".")[0]}</div>
          <div className="mt-1.5 text-[13px] text-muted">
            {visits} visits · {members.length} members
          </div>
        </Card>
        <Card>
          <Eyebrow>Next payout</Eyebrow>
          <div className="mt-1.5 num font-display text-[34px] leading-none">{money(pending, "USD", { compact: true }).split(".")[0]}</div>
          <div className="mt-1.5 text-[13px] text-muted">
            {practice.payoutLast4 ? (
              `${fmt(nextFri, tz, "EEE d MMM")} · ${practice.payoutBank} ••${practice.payoutLast4}`
            ) : (
              <Link href="/doctor/earnings?dialog=payout" className="font-bold text-forest">
                Connect a bank account
              </Link>
            )}
          </div>
        </Card>
        <Card>
          <Eyebrow>Memberships</Eyebrow>
          <div className="mt-1.5 num font-display text-[34px] leading-none">{money(mrr, "USD", { compact: true }).split(".")[0]}</div>
          <div className="mt-1.5 text-[13px] text-muted">{members.length} active · MRR</div>
        </Card>
        <Card>
          <Eyebrow>Refunds</Eyebrow>
          <div className="mt-1.5 num font-display text-[34px] leading-none">{money(refunded, "USD", { compact: true }).split(".")[0]}</div>
          <div className="mt-1.5 text-[13px] text-muted">{refunds.length} this month</div>
        </Card>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <b className="font-display text-[22px] font-normal">Revenue by month</b>
          <div className="mt-4">
            <BarChart bars={bars} format={(v) => money(v, "USD", { compact: true }).split(".")[0]} />
          </div>
        </Card>
        <Card className="!p-0">
          <b className="block px-6 pt-5 font-display text-[22px] font-normal">Recent payments</b>
          <div className="mt-2">
            {recent.map((p) => (
              <div key={p.id} className="flex items-center gap-3 border-t border-line-soft px-6 py-3">
                <span className="w-14 text-[13px] text-muted">{fmtShort(p.createdAt, tz)}</span>
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-[14.5px]">{p.patient.name}</b>
                  <span className="text-[12.5px] text-muted">{p.description}</span>
                </span>
                <span className="num text-sm font-bold">{p.status === "REFUNDED" ? `−${money(p.refundedCents, p.currency)}` : money(p.amountCents, p.currency)}</span>
                {(p.status === "PAID" || p.status === "PARTIALLY_REFUNDED") && (
                  <Link href={`/doctor/earnings?refund=${p.id}`} scroll={false} className="text-[13px] font-bold text-forest">
                    Refund
                  </Link>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
      {refunding && <RefundModal payment={refunding} closeHref="/doctor/earnings" returnTo="/doctor/earnings" error={sp.error === "amount"} />}
      {sp.dialog === "payout" && (
        <Modal closeHref="/doctor/earnings" title="Payout account" subtitle="Where weekly payouts are sent.">
          <form action={savePayout} className="flex flex-col gap-4">
            <div>
              <label htmlFor="bank" className="label">Bank</label>
              <input id="bank" name="bank" defaultValue={practice.payoutBank ?? ""} className="field" />
            </div>
            <div>
              <label htmlFor="account" className="label">Account number</label>
              <input id="account" name="account" inputMode="numeric" className="field" aria-invalid={sp.error ? true : undefined} />
            </div>
            <div>
              <label htmlFor="schedule" className="label">Schedule</label>
              <select id="schedule" name="schedule" defaultValue={practice.payoutSchedule ?? "Weekly"} className="field">
                <option>Weekly</option>
                <option>Monthly</option>
              </select>
            </div>
            <ModalActions>
              <ButtonLink href="/doctor/earnings" variant="secondary">Cancel</ButtonLink>
              <Button>Save account</Button>
            </ModalActions>
          </form>
        </Modal>
      )}
    </div>
  );
}
