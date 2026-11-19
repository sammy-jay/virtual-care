"use client";

import { useActionState } from "react";
import { CardFields, type CheckoutProvider } from "@/components/portal/card-form";
import { addCard, type PayState } from "../../billing/actions";

export function AddCardForm({ name, provider }: { name: string; provider: CheckoutProvider }) {
  const [s, action, pending] = useActionState<PayState, FormData>(addCard, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <CardFields defaultName={name} error={s.error} provider={provider} />
      {provider === "paystack" && <p className="text-[13px] text-muted">Paystack confirms the card with a ₦100 charge that is refunded straight away.</p>}
      <div>
        <button disabled={pending} className="rounded-full bg-forest px-6 py-3 font-bold text-white disabled:opacity-60">
          {pending ? "One moment…" : provider === "mock" ? "Save card" : `Add card on ${provider === "stripe" ? "Stripe" : "Paystack"}`}
        </button>
      </div>
    </form>
  );
}
