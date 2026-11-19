"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import { FieldError } from "@/components/ui";

export type CheckoutProvider = "mock" | "stripe" | "paystack";

/**
 * Card choice used by visit payment, plan checkout and payment methods.
 * - Saved cards are listed first.
 * - A new card: with live payments the patient enters it on Stripe's or Paystack's secure page
 *   (nothing card-related is typed on this site); in development (mock) the test fields show.
 */
export function CardFields({
  defaultName,
  error,
  savedMethods = [],
  provider = "mock",
  cardOnly = false,
}: {
  defaultName?: string;
  error?: string;
  savedMethods?: { id: string; label: string; isDefault: boolean }[];
  provider?: CheckoutProvider;
  /** Memberships renew from a saved card, so bank transfer and USSD are not offered. */
  cardOnly?: boolean;
}) {
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
            <span className="font-semibold">{provider === "paystack" && !cardOnly ? "Use a new card or bank transfer" : "Use a new card"}</span>
          </label>
        </div>
      )}
      {!useSaved && provider !== "mock" && <HostedNote provider={provider} error={error} cardOnly={cardOnly} />}
      {!useSaved && provider === "mock" && (
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
          <p className="text-[13px] text-muted">Test mode. The card is saved to Payment methods so refunds can return to it. You can remove it any time.</p>
        </>
      )}
      {useSaved && error && <FieldError>{error}</FieldError>}
    </div>
  );
}

function HostedNote({ provider, error, cardOnly }: { provider: "stripe" | "paystack"; error?: string; cardOnly?: boolean }) {
  const name = provider === "stripe" ? "Stripe" : "Paystack";
  return (
    <div className="rounded-2xl border-[1.5px] border-sage-line bg-sage p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-9 flex-none items-center justify-center rounded-full bg-white text-forest">
          <Icon name="lock" size={18} />
        </span>
        <div className="text-sm text-sage-ink">
          <b className="block text-ink">You&apos;ll pay on {name}&apos;s secure page</b>
          {provider === "paystack"
            ? cardOnly
              ? "Pay with a Nigerian card (Verve, Visa or Mastercard). Your card details go straight to Paystack; we never see them."
              : "Pay with a Nigerian card (Verve, Visa, Mastercard), bank transfer or USSD. Your card details go straight to Paystack; we never see them."
            : "Pay with any major card, Apple Pay or Google Pay. Your card details go straight to Stripe; we never see them."}
          <span className="mt-1 block text-[12.5px] text-muted">Your card is saved securely with {name} for future visits and membership renewals. You can remove it any time.</span>
        </div>
      </div>
      {error && <FieldError>{error}</FieldError>}
    </div>
  );
}
