import Link from "@/components/market";
import type { Metadata } from "next";
import { AuthSplit, AuthTitle } from "@/components/auth/auth-split";
import { Countdown } from "@/components/auth/widgets";
import { Alert } from "@/components/ui";
import { nowMs } from "@/lib/time";
import { requestReset } from "../../actions";

export const metadata: Metadata = { title: "Check your inbox" };

async function resend(form: FormData) {
  "use server";
  await requestReset({}, form);
}

export default async function ResetSentPage({ searchParams }: PageProps<"/forgot-password/sent">) {
  const { email } = await searchParams;
  const addr = typeof email === "string" ? email : "";
  return (
    <AuthSplit>
      <div className="flex flex-col gap-[22px]">
        <AuthTitle
          icon="mail"
          title="Check your inbox"
          lead={
            <>
              We sent a reset link to <b>{addr || "your email"}</b>. It works for 60 minutes.
            </>
          }
        />
        <Alert tone="info">Cannot find it? Check your spam folder, or make sure the address is correct.</Alert>
        <a href="mailto:" className="flex items-center justify-center rounded-full bg-forest px-7 py-4 font-bold text-white">
          Open email app
        </a>
        <div className="text-center text-[15px] text-[#4A5262]">
          Did not get it?{" "}
          <Countdown
            until={nowMs() + 45_000}
            prefix="Resend in "
            done={
              <form action={resend} className="inline">
                <input type="hidden" name="email" value={addr} />
                <button className="font-bold text-forest">Resend link</button>
              </form>
            }
          />
        </div>
        <Link href="/sign-in" className="text-center font-bold text-forest">
          ← Back to sign in
        </Link>
      </div>
    </AuthSplit>
  );
}
