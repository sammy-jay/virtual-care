"use client";

import { useActionState, useState } from "react";
import { CardFields } from "@/components/portal/card-form";
import { cn } from "@/lib/format";
import { joinPlan, type PayState } from "../billing/actions";

export function CheckoutForm({ plan, currency, name, label, methods, ngn }: { plan: string; currency: "USD" | "NGN"; name: string; label: string; methods: { id: string; label: string; isDefault: boolean }[]; ngn: boolean }) {
  const [s, action, pending] = useActionState<PayState, FormData>(joinPlan, {});
  const [via, setVia] = useState<"card" | "bank">("card");
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="plan" value={plan} />
      <input type="hidden" name="currency" value={currency} />
      {ngn && (
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              ["card", "Card", "Verve, Visa, Mastercard"],
              ["bank", "Bank transfer", "Confirmed in minutes"],
            ] as const
          ).map(([k, t, b]) => (
            <button type="button" key={k} onClick={() => setVia(k)} aria-pressed={via === k} className={cn("rounded-2xl border-[1.5px] p-4 text-left", via === k ? "border-forest bg-sage" : "border-line")}>
              <b className="block">{t}</b>
              <span className="text-[13px] text-muted">{b}</span>
            </button>
          ))}
        </div>
      )}
      {via === "bank" ? (
        <div className="rounded-2xl bg-canvas p-4 text-sm text-body">
          Bank transfer is confirmed by the payment provider when live payments are switched on. Use a card for now.
        </div>
      ) : (
        <CardFields defaultName={name} error={s.error} savedMethods={methods} />
      )}
      <button disabled={pending || via === "bank"} className="rounded-full bg-forest px-6 py-4 font-bold text-white disabled:opacity-60">
        {pending ? "Processing…" : label}
      </button>
    </form>
  );
}
