"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { AuthInput, SubmitButton, authSelectCls } from "@/components/auth/auth-split";
import { CodeInput, PasswordStrength } from "@/components/auth/widgets";
import { Alert, FieldError } from "@/components/ui";
import { TIME_ZONES } from "@/lib/time";
import { doctorSignIn, requestReset, resetPassword, signIn, signUp, verifyEmail, type FormState } from "./actions";

export function SignUpForm({ next }: { next?: string }) {
  const [s, action, pending] = useActionState<FormState, FormData>(signUp, {});
  const [tz, setTz] = useState("Africa/Lagos");
  useEffect(() => {
    const d = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // Device time zone is only knowable in the browser, after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (TIME_ZONES.some((z) => z.id === d)) setTz(d);
  }, []);
  const e = s.errors ?? {};
  const v = s.values ?? {};
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      {s.message && <Alert tone="error">{s.message}</Alert>}
      <div className="grid gap-3.5 sm:grid-cols-2">
        <AuthInput label="Full name" name="name" autoComplete="name" placeholder="Your name" defaultValue={v.name} error={e.name} />
        <AuthInput label="Phone (optional)" name="phone" type="tel" autoComplete="tel" placeholder="+234 …" defaultValue={v.phone} error={e.phone} />
      </div>
      <AuthInput label="Email" name="email" type="email" autoComplete="email" placeholder="you@example.com" defaultValue={v.email} error={e.email} />
      <PasswordStrength error={e.password} />
      <div>
        <label htmlFor="timeZone" className="mb-[7px] block text-sm font-semibold">
          Time zone
        </label>
        <select id="timeZone" name="timeZone" value={v.timeZone || tz} onChange={(ev) => setTz(ev.target.value)} className={authSelectCls}>
          {TIME_ZONES.map((z) => (
            <option key={z.id} value={z.id}>
              {z.label}
            </option>
          ))}
        </select>
        <div className="mt-[7px] text-[13px] text-[#5A6272]">Detected from your device. You can change it any time.</div>
      </div>
      <div>
        <label className="flex items-start gap-3 text-[14.5px] text-body-2">
          <input type="checkbox" name="consent" className="mt-0.5 size-[22px] flex-none accent-forest" aria-invalid={e.consent ? true : undefined} />
          <span>
            I accept the{" "}
            <Link href="/telehealth-consent" target="_blank" className="underline">
              Telehealth Consent
            </Link>
            ,{" "}
            <Link href="/privacy" target="_blank" className="underline">
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link href="/terms" target="_blank" className="underline">
              Terms
            </Link>
            .
          </span>
        </label>
        <FieldError>{e.consent}</FieldError>
      </div>
      <SubmitButton pending={pending}>Create account</SubmitButton>
    </form>
  );
}

export function SignInForm({ next, expired }: { next?: string; expired?: boolean }) {
  const [s, action, pending] = useActionState<FormState, FormData>(signIn, {});
  const v = s.values ?? {};
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      {expired && !s.message && <Alert tone="warning">Your session expired. Please sign in again to continue.</Alert>}
      {s.message && <Alert tone="error">{s.message}</Alert>}
      <AuthInput label="Email" name="email" type="email" autoComplete="email" placeholder="you@example.com" defaultValue={v.email} />
      <AuthInput label="Password" name="password" type="password" autoComplete="current-password" placeholder="Your password" error={s.errors?.password} />
      <div className="flex items-center justify-between gap-3 text-[14.5px]">
        <label className="flex items-center gap-2.5 text-body-2">
          <input type="checkbox" name="remember" className="size-5 accent-forest" defaultChecked />
          Keep me signed in
        </label>
        <Link href="/forgot-password" className="font-bold text-forest">
          Forgot password?
        </Link>
      </div>
      <SubmitButton pending={pending}>Sign in</SubmitButton>
    </form>
  );
}

export function DoctorSignInForm() {
  const [s, action, pending] = useActionState<FormState, FormData>(doctorSignIn, {});
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      {s.message && <Alert tone="error">{s.message}</Alert>}
      <AuthInput label="Email" name="email" type="email" autoComplete="email" placeholder="you@practice.com" defaultValue={s.values?.email} />
      <AuthInput label="Password" name="password" type="password" autoComplete="current-password" error={s.errors?.password} />
      <div>
        <div className="mb-[7px] text-sm font-semibold">6-digit code</div>
        <CodeInput error={!!s.errors?.code} />
        {s.errors?.code ? <FieldError>{s.errors.code}</FieldError> : <div className="mt-[7px] text-[13px] text-[#5A6272]">From your authenticator app. Changes every 30 seconds.</div>}
      </div>
      <SubmitButton pending={pending}>Sign in</SubmitButton>
    </form>
  );
}

export function VerifyForm({ next }: { next?: string }) {
  const [s, action, pending] = useActionState<FormState, FormData>(verifyEmail, {});
  return (
    <form action={action} className="flex flex-col gap-[22px]">
      {next && <input type="hidden" name="next" value={next} />}
      <CodeInput error={!!s.message} />
      {s.message ? <Alert tone="error">{s.message}</Alert> : <Alert tone="info">The code works for 15 minutes.</Alert>}
      <SubmitButton pending={pending}>Verify and continue</SubmitButton>
    </form>
  );
}

export function ForgotForm({ defaultEmail, cta = "Send reset link" }: { defaultEmail?: string; cta?: string }) {
  const [s, action, pending] = useActionState<FormState, FormData>(requestReset, {});
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <AuthInput label="Email" name="email" type="email" autoComplete="email" placeholder="you@example.com" defaultValue={s.values?.email ?? defaultEmail} error={s.errors?.email} />
      <SubmitButton pending={pending}>{cta}</SubmitButton>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [s, action, pending] = useActionState<FormState, FormData>(resetPassword, {});
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="token" value={token} />
      <PasswordStrength label="New password" error={s.errors?.password} />
      <AuthInput label="Confirm password" name="confirm" type="password" autoComplete="new-password" error={s.errors?.confirm} />
      <SubmitButton pending={pending}>Update password</SubmitButton>
    </form>
  );
}
