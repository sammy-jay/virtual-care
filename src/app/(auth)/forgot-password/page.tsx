import Link from "next/link";
import type { Metadata } from "next";
import { AuthSplit, AuthTitle } from "@/components/auth/auth-split";
import { ForgotForm } from "../forms";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <AuthSplit>
      <div className="flex flex-col gap-[22px]">
        <AuthTitle icon="lock" title="Reset your password" lead="Enter the email you signed up with. We will send a link that works once and for 60 minutes." />
        <ForgotForm />
        <Link href="/sign-in" className="text-center font-bold text-forest">
          ← Back to sign in
        </Link>
      </div>
    </AuthSplit>
  );
}
