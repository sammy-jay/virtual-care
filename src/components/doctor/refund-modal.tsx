import type { Payment, PaymentMethod, User } from "@prisma/client";
import { Modal, ModalActions } from "@/components/modal";
import { Button, ButtonLink } from "@/components/ui";
import { money } from "@/lib/format";
import { issueRefund } from "@/app/doctor/actions";

/** 10.9 — full or partial refund with a reason sent to the patient. */
export function RefundModal({ payment, closeHref, returnTo, error }: { payment: Payment & { patient: User; paymentMethod: PaymentMethod | null }; closeHref: string; returnTo: string; error?: boolean }) {
  const left = payment.amountCents - payment.refundedCents;
  return (
    <Modal closeHref={closeHref} title="Issue refund" subtitle={`${payment.patient.name} · ${payment.description} · ${money(payment.amountCents, payment.currency)}`} icon="refresh">
      <form action={issueRefund} className="flex flex-col gap-3">
        <input type="hidden" name="paymentId" value={payment.id} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border-[1.5px] border-line p-4 has-[:checked]:border-forest has-[:checked]:bg-sage">
          <input type="radio" name="kind" value="full" defaultChecked className="mt-1 size-5 accent-forest" />
          <span>
            <b className="block">Full refund · {money(left, payment.currency)}</b>
            <span className="text-[13px] text-muted">Back to {payment.paymentMethod ? `${payment.paymentMethod.brand} ••${payment.paymentMethod.last4}` : "the original card"} in 3 to 5 days</span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border-[1.5px] border-line p-4 has-[:checked]:border-forest has-[:checked]:bg-sage">
          <input type="radio" name="kind" value="partial" className="mt-1 size-5 accent-forest" />
          <span className="flex-1">
            <b className="block">Partial refund</b>
            <input name="amount" inputMode="decimal" placeholder="Choose an amount" aria-label="Refund amount" className="field mt-2" aria-invalid={error ? true : undefined} />
            {error && <span className="mt-1 block text-[13px] font-semibold text-danger">Enter an amount up to {money(left, payment.currency)}.</span>}
          </span>
        </label>
        <div>
          <label htmlFor="reason" className="label">Reason (sent to patient)</label>
          <input id="reason" name="reason" defaultValue="Rescheduled by the doctor" className="field" />
        </div>
        <ModalActions>
          <ButtonLink href={closeHref} variant="secondary">
            Cancel
          </ButtonLink>
          <Button>Refund</Button>
        </ModalActions>
      </form>
    </Modal>
  );
}
