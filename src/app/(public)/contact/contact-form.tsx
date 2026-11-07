"use client";

import { useActionState } from "react";
import { Alert, FieldError } from "@/components/ui";
import { sendInquiry, type ContactState } from "./actions";

const input = "w-full rounded-[14px] border-[1.5px] border-field bg-white px-4 py-[15px] text-base text-ink focus:border-forest focus:outline-none aria-[invalid=true]:border-danger";

export function ContactForm() {
  const [state, action, pending] = useActionState<ContactState, FormData>(sendInquiry, {});
  if (state.ok)
    return (
      <Alert tone="success">
        <b>Message sent.</b> We reply within 1 business day. Look out for an email from the practice.
      </Alert>
    );
  const e = state.errors ?? {};
  const v = state.values ?? {};
  return (
    <form action={action} className="flex flex-col gap-[18px]" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="cn" className="mb-[7px] block text-sm font-semibold">Your name</label>
          <input id="cn" name="name" placeholder="Full name" defaultValue={v.name} aria-invalid={!!e.name} className={input} autoComplete="name" />
          <FieldError>{e.name}</FieldError>
        </div>
        <div>
          <label htmlFor="ce" className="mb-[7px] block text-sm font-semibold">Email</label>
          <input id="ce" name="email" type="email" placeholder="you@example.com" defaultValue={v.email} aria-invalid={!!e.email} className={input} autoComplete="email" />
          <FieldError>{e.email}</FieldError>
        </div>
      </div>
      <div>
        <label htmlFor="cs" className="mb-[7px] block text-sm font-semibold">Topic</label>
        <input id="cs" name="topic" placeholder="e.g. Membership question" defaultValue={v.topic} aria-invalid={!!e.topic} className={input} />
        <FieldError>{e.topic}</FieldError>
      </div>
      <div>
        <label htmlFor="cm" className="mb-[7px] block text-sm font-semibold">How can we help?</label>
        <textarea id="cm" name="body" rows={5} placeholder="Write your message…" defaultValue={v.body} aria-invalid={!!e.body} className={`${input} resize-none`} />
        <FieldError>{e.body}</FieldError>
      </div>
      <div>
        <label className="flex gap-3 text-[14.5px] text-body-2">
          <input type="checkbox" name="ack" className="mt-0.5 size-[22px] flex-none accent-forest" />
          I understand this form is not for emergencies or medical advice.
        </label>
        <FieldError>{e.ack}</FieldError>
      </div>
      <div>
        <button disabled={pending} className="inline-flex items-center gap-2.5 rounded-full bg-forest px-7 py-4 text-base font-bold text-white disabled:opacity-60">
          {pending ? "Sending…" : "Send message"}
        </button>
      </div>
    </form>
  );
}
