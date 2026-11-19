"use client";

import { useActionState } from "react";
import { CardFields, type CheckoutProvider } from "@/components/portal/card-form";
import { payForVisit, type PayState } from "../../../billing/actions";

export function PayVisitForm({
  appointmentId,
  name,
  amount,
  methods,
  provider,
}: {
  appointmentId: string;
  name: string;
  amount: string;
  methods: { id: string; label: string; isDefault: boolean }[];
  provider: CheckoutProvider;
}) {
  const [s, action, pending] = useActionState<PayState, FormData>(payForVisit, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="appointmentId" value={appointmentId} />
      <CardFields defaultName={name} error={s.error} savedMethods={methods} provider={provider} />
      <button disabled={pending} className="mt-1 rounded-full bg-forest px-6 py-4 font-bold text-white disabled:opacity-60">
        {pending ? "One moment…" : `Pay ${amount}`}
      </button>
      <p className="text-center text-[13px] text-muted">Charged now. Card details are handled by {provider === "paystack" ? "Paystack" : provider === "stripe" ? "Stripe" : "our payment provider"}; we never see them.</p>
    </form>
  );
}
