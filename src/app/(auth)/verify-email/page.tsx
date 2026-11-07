import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthSplit, AuthTitle } from "@/components/auth/auth-split";
import { Countdown } from "@/components/auth/widgets";
import { getSession } from "@/lib/auth/dal";
import { resendCode, signOut } from "../actions";
import { nowMs } from "@/lib/time";
import { VerifyForm } from "../forms";

export const metadata: Metadata = { title: "Verify your email" };

export default async function VerifyEmailPage({ searchParams }: PageProps<"/verify-email">) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  if (session.user.emailVerified) redirect("/portal");
  const { next, resent } = await searchParams;
  const cooldown = nowMs() + 30_000;
  return (
    <AuthSplit>
      <div className="flex flex-col gap-[22px]">
        <AuthTitle
          icon="mail"
          title="Verify your email"
          lead={
            <>
              Enter the 6-digit code we sent to <b>{session.user.email}</b>.
            </>
          }
        />
        {resent === "1" && <p className="text-sm font-semibold text-forest">A new code is on its way.</p>}
        <VerifyForm next={typeof next === "string" ? next : undefined} />
        <div className="text-center text-[15px] text-[#4A5262]">
          No code?{" "}
          <Countdown
            until={cooldown}
            prefix="Resend in "
            done={
              <form action={resendCode} className="inline">
                <button className="font-bold text-forest">Resend code</button>
              </form>
            }
          />{" "}
          ·{" "}
          <form action={signOut} className="inline">
            <button className="font-bold text-forest">Change email</button>
          </form>
        </div>
      </div>
    </AuthSplit>
  );
}
