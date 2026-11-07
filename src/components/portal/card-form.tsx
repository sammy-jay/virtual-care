"use client";

import { useState } from "react";
import { FieldError } from "@/components/ui";

/**
 * Card entry used by checkout, visit payment and payment methods.
 * Mock provider only: in live mode this is replaced by the provider's hosted fields.
 */
export function CardFields({ defaultName, error, savedMethods = [] }: { defaultName?: string; error?: string; savedMethods?: { id: string; label: string; isDefault: boolean }[] }) {
  const [useSaved, setUseSaved] = useState(savedMethods.length > 0);
  const [num, setNum] = useState("");
  const fmtNum = (v: string) => v.replace(/\D/g, "").slice(0, 19).replace(/(.{4})/g, "$1 ").trim();
  return (
    <div className="flex flex-col gap-4">
      {savedMethods.length > 0 && (
        <div className="flex flex-col gap-2">
          {savedMethods.map((m) => (
            <label key={m.id} className="flex cursor-pointer items-center gap-3 rounded-xl border-[1.5px] border-line px-4 py-3 has-[:checked]:border-forest">
              <input type="radio" name="paymentMethodId" value={m.id} defaultChecked={m.isDefault} onChange={() => setUseSaved(true)} className="size-5 accent-forest" />
              <span className="font-semibold">{m.label}</span>
              {m.isDefault && <span className="ml-auto text-[12px] text-muted">Default</span>}
            </label>
          ))}
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border-[1.5px] border-line px-4 py-3 has-[:checked]:border-forest">
            <input type="radio" name="paymentMethodId" value="new" onChange={() => setUseSaved(false)} className="size-5 accent-forest" />
            <span className="font-semibold">Use a new card</span>
          </label>
        </div>
      )}
      {!useSaved && (
        <>
          <div>
            <label htmlFor="cardNumber" className="label">Card number</label>
            <input id="cardNumber" name="cardNumber" inputMode="numeric" autoComplete="cc-number" value={num} onChange={(e) => setNum(fmtNum(e.target.value))} placeholder="4242 4242 4242 4242" className="field" aria-invalid={error ? true : undefined} />
            <FieldError>{error}</FieldError>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="exp" className="label">Expiry</label>
              <input id="exp" name="exp" autoComplete="cc-exp" placeholder="MM / YY" className="field" />
            </div>
            <div>
              <label htmlFor="cvc" className="label">CVC</label>
              <input id="cvc" name="cvc" autoComplete="cc-csc" inputMode="numeric" placeholder="•••" className="field" />
            </div>
          </div>
          <div>
            <label htmlFor="cardName" className="label">Name on card</label>
            <input id="cardName" name="cardName" autoComplete="cc-name" defaultValue={defaultName} className="field" />
          </div>
          <p className="text-[13px] text-muted">The card is saved to Payment methods so refunds can return to it. You can remove it any time.</p>
        </>
      )}
    </div>
  );
}
