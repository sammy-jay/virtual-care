import type { Metadata } from "next";
import { Alert, ButtonLink, Card } from "@/components/ui";
import { requirePatient } from "@/lib/auth/dal";
import { getActiveMembership } from "@/lib/care";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Payment failed" };

export default async function PaymentFailedPage({ searchParams }: PageProps<"/portal/billing/failed">) {
  const user = await requirePatient();
  const sp = await searchParams;
  const p = typeof sp.payment === "string" ? await db.payment.findFirst({ where: { id: sp.payment, patientId: user.id }, include: { paymentMethod: true } }) : null;
  const retry = typeof sp.retry === "string" && sp.retry.startsWith("/portal") ? sp.retry : "/portal/billing";
  const m = await getActiveMembership(user.id);
  return (
    <div className="mx-auto max-w-[620px]">
      <Alert tone="error" className="mb-5">
        Your card was declined by the bank. You have not been charged.
      </Alert>
      <Card>
        <div className="eyebrow !text-danger">Update payment</div>
        <h1 className="h-display mt-2 text-[32px]">Payment for {p?.description ?? "your order"} did not go through</h1>
        {p?.paymentMethod && (
          <div className="mt-4">
            <div className="label">Card number</div>
            <div className="field !border-danger">•••• •••• •••• {p.paymentMethod.last4}</div>
            <p className="mt-1.5 text-[13px] font-semibold text-danger">{p.failureReason ?? "This card was declined. Try another card."}</p>
          </div>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href={retry}>Try another card</ButtonLink>
          <ButtonLink href="/portal/help" variant="secondary">
            Contact support
          </ButtonLink>
        </div>
        {m?.status === "PAST_DUE" && <p className="mt-4 text-sm text-muted">Your plan stays active for 3 days while you update your card.</p>}
      </Card>
    </div>
  );
}
