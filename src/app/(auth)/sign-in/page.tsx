import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthSplit, AuthTitle } from "@/components/auth/auth-split";
import { getUser } from "@/lib/auth/dal";
import { SignInForm } from "../forms";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const { next, expired } = await searchParams;
  const user = await getUser();
  if (user) redirect(user.role === "PATIENT" ? "/portal" : "/doctor");
  return (
    <AuthSplit perks>
      <div className="flex flex-col gap-5">
        <AuthTitle title="Welcome back" lead="Sign in to your patient portal." />
        <SignInForm next={typeof next === "string" ? next : undefined} expired={expired === "1"} />
        <p className="text-center text-[15px] text-[#4A5262]">
          New here?{" "}
          <Link href="/sign-up" className="font-bold text-forest">
            Create an account
          </Link>
        </p>
      </div>
    </AuthSplit>
  );
}
