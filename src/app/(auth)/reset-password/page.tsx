import Link from "next/link";
import type { Metadata } from "next";
import { AuthSplit, AuthTitle } from "@/components/auth/auth-split";
import { findResetToken } from "@/lib/auth/tokens";
import { ForgotForm, ResetForm } from "../forms";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const { token } = await searchParams;
  const raw = typeof token === "string" ? token : "";
  const valid = raw ? await findResetToken(raw) : null;
  if (!valid)
    return (
      <AuthSplit>
        <div className="flex flex-col gap-[22px]">
          <AuthTitle icon="clock" iconTone="coral" title="This link has expired" lead="Reset links work once and for 60 minutes. Request a new one and we will email it right away." />
          <ForgotForm cta="Send a new link" />
          <Link href="/sign-in" className="text-center font-bold text-forest">
            ← Back to sign in
          </Link>
        </div>
      </AuthSplit>
    );
  return (
    <AuthSplit>
      <div className="flex flex-col gap-[22px]">
        <AuthTitle icon="lock" title="Choose a new password" lead="Use at least 10 characters. This link works once." />
        <ResetForm token={raw} />
      </div>
    </AuthSplit>
  );
}
