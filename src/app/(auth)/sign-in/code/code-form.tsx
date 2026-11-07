"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/auth/auth-split";
import { CodeInput } from "@/components/auth/widgets";
import { Alert } from "@/components/ui";
import { verifySignInCode, type FormState } from "../../actions";

export function CodeForm({ next, remember }: { next: string; remember: string }) {
  const [s, action, pending] = useActionState<FormState, FormData>(verifySignInCode, {});
  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="remember" value={remember} />
      <CodeInput error={!!s.message} />
      {s.message && <Alert tone="error">{s.message}</Alert>}
      <SubmitButton pending={pending}>Sign in</SubmitButton>
    </form>
  );
}
