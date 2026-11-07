import type { Metadata } from "next";
import { AuthSplit, AuthTitle } from "@/components/auth/auth-split";
import { Countdown } from "@/components/auth/widgets";
import { nowMs } from "@/lib/time";
import { ButtonLink } from "@/components/ui";

export const metadata: Metadata = { title: "Too many attempts" };

export default async function LockedPage({ searchParams }: PageProps<"/sign-in/locked">) {
  const { until } = await searchParams;
  const t = Number(until) || nowMs() + 15 * 60_000;
  return (
    <AuthSplit>
      <div className="flex flex-col gap-[22px]">
        <AuthTitle icon="lock" title="Too many attempts" lead="For your security, sign-in is paused for 15 minutes. You can reset your password now instead." />
        <div className="flex items-center justify-between rounded-[18px] bg-coral-tint px-5 py-[18px]">
          <span className="text-[#4A5262]">Try again in</span>
          <span className="font-display text-[34px]">
            <Countdown until={t} done="now" />
          </span>
        </div>
        <ButtonLink href="/forgot-password" size="lg">
          Reset password
        </ButtonLink>
        <ButtonLink href="/" variant="outline" size="lg">
          Back to home
        </ButtonLink>
      </div>
    </AuthSplit>
  );
}
