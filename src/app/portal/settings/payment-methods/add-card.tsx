"use client";

import { useActionState } from "react";
import { CardFields } from "@/components/portal/card-form";
import { addCard, type PayState } from "../../billing/actions";

export function AddCardForm({ name }: { name: string }) {
  const [s, action, pending] = useActionState<PayState, FormData>(addCard, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <CardFields defaultName={name} error={s.error} />
      <div>
        <button disabled={pending} className="rounded-full bg-forest px-6 py-3 font-bold text-white disabled:opacity-60">
          {pending ? "Saving…" : "Save card"}
        </button>
      </div>
    </form>
  );
}
