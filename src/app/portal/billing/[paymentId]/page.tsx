import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { ButtonLink, Card, Row, StatusTag } from "@/components/ui";
import { requirePatient } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { money } from "@/lib/format";
import { fmt } from "@/lib/time";

export const metadata: Metadata = { title: "Receipt" };

export default async function ReceiptPage({ params }: PageProps<"/portal/billing/[paymentId]">) {
  const user = await requirePatient();
  const { paymentId } = await params;
  const p = await db.payment.findUnique({ where: { id: paymentId }, include: { paymentMethod: true } });
  if (!p || p.patientId !== user.id) notFound();
  const practice = await db.practice.findFirst();
  const usd = p.currency === "NGN" && practice ? money(Math.round(p.amountCents / practice.ngnPerUsd)) : null;
  return (
    <div className="mx-auto max-w-[620px] print:max-w-none">
      <Card className="print:border-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="eyebrow">Receipt · Dr. Nneoma Oparaji · Virtual care</div>
            <div className="mt-2 font-display text-[48px] leading-none">{money(p.amountCents, p.currency)}</div>
            {usd && <div className="mt-1 text-sm text-muted">≈ {usd} at the practice rate</div>}
          </div>
          <StatusTag status={p.status} />
        </div>
        <div className="mt-5">
          <Row label="Date">{fmt(p.createdAt, user.timeZone, "d MMM yyyy")}</Row>
          <Row label="Description">{p.description}</Row>
          <Row label="Method">{p.paymentMethod ? `${p.paymentMethod.brand} ending ${p.paymentMethod.last4}` : p.amountCents === 0 ? "No charge" : "Card"}</Row>
          <Row label="Receipt no.">{p.receiptNo}</Row>
          <Row label="Billed to">{user.name}</Row>
          {p.refundedCents > 0 && <Row label="Refunded">−{money(p.refundedCents, p.currency)}</Row>}
          <div className="mt-1 flex items-baseline justify-between border-t-2 border-ink pt-3.5">
            <b>Total</b>
            <span className="font-display text-[28px]">{money(p.amountCents - p.refundedCents, p.currency)}</span>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3 print:hidden">
          <PrintButton label="Download PDF" />
          <ButtonLink href="/portal/billing" variant="secondary">
            Back to billing
          </ButtonLink>
        </div>
      </Card>
    </div>
  );
}
