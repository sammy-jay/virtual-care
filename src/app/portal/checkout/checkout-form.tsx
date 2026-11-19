"use client";

import { useActionState } from "react";
import { CardFields, type CheckoutProvider } from "@/components/portal/card-form";
import { joinPlan, type PayState } from "../billing/actions";

export function CheckoutForm({
  plan,
  name,
  label,
  methods,
  provider,
}: {
  plan: string;
  name: string;
  label: string;
  methods: { id: string; label: string; isDefault: boolean }[];
  provider: CheckoutProvider;
}) {
  const [s, action, pending] = useActionState<PayState, FormData>(joinPlan, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="plan" value={plan} />
      <CardFields defaultName={name} error={s.error} savedMethods={methods} provider={provider} cardOnly />
      <button disabled={pending} className="rounded-full bg-forest px-6 py-4 font-bold text-white disabled:opacity-60">
        {pending ? "One moment…" : label}
      </button>
      {provider === "paystack" && <p className="text-center text-[13px] text-muted">Memberships renew from a saved card, so plans are paid by card.</p>}
    </form>
  );
}
