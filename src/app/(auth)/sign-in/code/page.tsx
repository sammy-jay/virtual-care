import Link from "@/components/market";
import type { Metadata } from "next";
import { AuthSplit, AuthTitle } from "@/components/auth/auth-split";
import { CodeForm } from "./code-form";

export const metadata: Metadata = { title: "Enter your code" };

export default async function SignInCodePage({ searchParams }: PageProps<"/sign-in/code">) {
  const { next, remember } = await searchParams;
  return (
    <AuthSplit>
      <div className="flex flex-col gap-[22px]">
        <AuthTitle icon="shield" title="Enter your code" lead="Open your authenticator app and enter the 6-digit code for Dr. Oparaji Virtual Care." />
        <CodeForm next={typeof next === "string" ? next : "/portal"} remember={remember === "1" ? "1" : "0"} />
        <Link href="/sign-in" className="text-center font-bold text-forest">
          ← Back to sign in
        </Link>
      </div>
    </AuthSplit>
  );
}
