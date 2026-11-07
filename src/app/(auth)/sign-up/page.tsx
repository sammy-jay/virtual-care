import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthSplit, AuthTitle } from "@/components/auth/auth-split";
import { getUser } from "@/lib/auth/dal";
import { SignUpForm } from "../forms";

export const metadata: Metadata = { title: "Create your account" };

export default async function SignUpPage({ searchParams }: PageProps<"/sign-up">) {
  if (await getUser()) redirect("/portal");
  const { next, plan } = await searchParams;
  const after = typeof next === "string" ? next : typeof plan === "string" ? `/portal/checkout?plan=${plan}` : undefined;
  return (
    <AuthSplit perks>
      <div className="flex flex-col gap-5">
        <AuthTitle title="Create your account" lead="Takes two minutes. Then book your free intro call." />
        <SignUpForm next={after} />
        <p className="text-center text-[15px] text-[#4A5262]">
          Already registered?{" "}
          <Link href="/sign-in" className="font-bold text-forest">
            Sign in
          </Link>
        </p>
      </div>
    </AuthSplit>
  );
}
