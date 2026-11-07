"use client";

import { useActionState, useState, useTransition } from "react";
import { CodeInput } from "@/components/auth/widgets";
import { Alert, Button, Field, FieldError } from "@/components/ui";
import { changePassword, confirmTotp, startTotp, type PwState, type TotpState } from "../actions";

export function PasswordForm() {
  const [s, action, pending] = useActionState<PwState, FormData>(changePassword, {});
  return (
    <form action={action} className="mt-4 flex flex-col gap-4" noValidate>
      {s.ok && <Alert tone="success">Password updated. Other devices were signed out.</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Current password" name="current" type="password" autoComplete="current-password" error={s.errors?.current} />
        <Field label="New password" name="password" type="password" autoComplete="new-password" placeholder="At least 10 characters" error={s.errors?.password} />
      </div>
      <div>
        <Button disabled={pending}>{pending ? "Updating…" : "Update password"}</Button>
      </div>
    </form>
  );
}

export function TotpSetup({ enabled }: { enabled: boolean }) {
  const [setup, setSetup] = useState<TotpState | null>(null);
  const [pending, start] = useTransition();
  const [s, action, confirming] = useActionState<TotpState, FormData>(confirmTotp, {});
  if (enabled || s.ok) return <Alert tone="success">Two-step sign-in is on. You will be asked for a code on new devices.</Alert>;
  if (!setup)
    return (
      <Button variant="secondary" disabled={pending} onClick={() => start(async () => setSetup(await startTotp()))}>
        {pending ? "Preparing…" : "Turn on"}
      </Button>
    );
  return (
    <form action={action} className="mt-2 flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={setup.qr} alt="QR code for your authenticator app" width={180} height={180} className="rounded-xl border border-line" />
        <div className="text-sm text-body">
          Scan with your authenticator app, or enter this key:
          <code className="mt-1 block rounded-lg bg-canvas px-3 py-2 font-mono text-ink">{setup.secret}</code>
        </div>
      </div>
      <div>
        <div className="label">6-digit code</div>
        <CodeInput error={!!s.error} />
        <FieldError>{s.error}</FieldError>
      </div>
      <div>
        <Button disabled={confirming}>Confirm and turn on</Button>
      </div>
    </form>
  );
}
