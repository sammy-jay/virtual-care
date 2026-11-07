import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ButtonLink, Card, IconTile, Row } from "@/components/ui";
import { requirePatient } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { money } from "@/lib/format";

export const metadata: Metadata = { title: "Refund" };

export default async function RefundNoticePage({ params }: PageProps<"/portal/billing/refunds/[id]">) {
  const user = await requirePatient();
  const { id } = await params;
  const r = await db.refund.findUnique({ where: { id }, include: { payment: { include: { paymentMethod: true } } } });
  if (!r || r.payment.patientId !== user.id) notFound();
  return (
    <div className="mx-auto max-w-[620px]">
      <Card>
        <IconTile icon="refresh" tone="sage" />
        <h1 className="h-display mt-4 text-[36px]">{money(r.amountCents, r.payment.currency)} refunded</h1>
        <p className="mt-2 text-[15.5px] text-body">{r.reason}</p>
        <div className="mt-5">
          <Row label="Refund to">{r.payment.paymentMethod ? `${r.payment.paymentMethod.brand} ending ${r.payment.paymentMethod.last4}` : "Original payment method"}</Row>
          <Row label="Arrives">3 to 5 business days</Row>
          <Row label="Reference">{r.reference}</Row>
        </div>
        <div className="mt-6 flex gap-3">
          <ButtonLink href="/portal/book">Rebook visit</ButtonLink>
          <ButtonLink href="/portal/billing" variant="secondary">
            Back to billing
          </ButtonLink>
        </div>
      </Card>
    </div>
  );
}
