import Link from "@/components/market";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthSplit, AuthTitle } from "@/components/auth/auth-split";
import { getUser } from "@/lib/auth/dal";
import { DoctorSignInForm } from "../../(auth)/forms";

export const metadata: Metadata = { title: "Doctor sign in" };

export default async function DoctorSignInPage() {
  const user = await getUser();
  if (user && user.role !== "PATIENT") redirect("/doctor");
  return (
    <AuthSplit>
      <div className="flex flex-col gap-5">
        <div className="eyebrow !text-gold-ink">Doctor portal</div>
        <AuthTitle title="Welcome back, Doctor" lead="Sign in, then confirm with your authenticator app." />
        <DoctorSignInForm />
        <p className="text-center text-[15px] text-[#4A5262]">
          <Link href="/forgot-password" className="font-bold text-forest">
            Forgot password?
          </Link>{" "}
          ·{" "}
          <Link href="/contact" className="font-bold text-forest">
            Lost your device?
          </Link>
        </p>
      </div>
    </AuthSplit>
  );
}
