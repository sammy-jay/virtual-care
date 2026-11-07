import Link from "next/link";
import type { Metadata } from "next";
import { Icon } from "@/components/icons";
import { ButtonLink } from "@/components/ui";
import { requirePatient } from "@/lib/auth/dal";
import { getPlans, getVisitTypes } from "@/lib/care";
import { moneyShort } from "@/lib/format";

export const metadata: Metadata = { title: "Next steps" };

/** 04.10 — shown after the intro call. */
export default async function NextStepsPage() {
  await requirePatient();
  const [types, plans] = await Promise.all([getVisitTypes(), getPlans()]);
  const initial = types.find((t) => t.slug === "initial-consultation");
  const followUp = types.find((t) => t.slug === "follow-up");
  const thrive = plans.find((p) => p.popular) ?? plans[0];
  const tick = (t: string) => (
    <li key={t} className="flex gap-2">
      <Icon name="check" size={17} strokeWidth={2.4} className="mt-0.5 text-forest" />
      {t}
    </li>
  );
  return (
    <div className="mx-auto max-w-[1000px]">
      <div className="eyebrow">Intro call complete</div>
      <h1 className="h-display mt-2 text-[34px] md:text-[40px]">Thank you. How would you like to continue?</h1>
      <p className="mt-2 max-w-[640px] text-[15.5px] text-body">Dr. Oparaji will publish a short summary after your call. In the meantime, here are two ways to keep going.</p>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <div className="card flex flex-col">
          <div className="eyebrow !text-muted">Pay per visit</div>
          <b className="mt-2 font-display text-[28px] font-normal">{initial?.name}</b>
          <p className="text-sm text-body">
            {initial?.durationMin} min · {initial ? moneyShort(initial.priceCents) : ""} — pay only when you book
          </p>
          <ul className="my-5 flex flex-1 flex-col gap-2 text-[15px]">
            {["Full history and goals review", "Written care plan after the visit", `Follow-ups ${followUp ? moneyShort(followUp.priceCents) : ""} each, no commitment`].map(tick)}
          </ul>
          <ButtonLink href="/portal/book?type=initial-consultation" variant="secondary">
            Book a paid consultation
          </ButtonLink>
        </div>
        {thrive && (
          <div className="flex flex-col rounded-[20px] border-2 border-forest bg-white p-6">
            <span className="w-fit rounded-full bg-gold px-3 py-1 text-[12px] font-bold">Recommended</span>
            <div className="eyebrow mt-3">Membership</div>
            <b className="mt-2 font-display text-[28px] font-normal">
              {thrive.name} · {moneyShort(thrive.monthlyPriceCents)}/mo
            </b>
            <p className="text-sm text-body">{thrive.includedLabel} included each month</p>
            <ul className="my-5 flex flex-1 flex-col gap-2 text-[15px]">
              {[`${thrive.includedLabel} (30 min) included every month`, `${thrive.discountPct}% off every other visit`, "Secure messaging between visits", "Cancel any time"].map(tick)}
            </ul>
            <ButtonLink href={`/portal/checkout?plan=${thrive.slug}`}>Join {thrive.name}</ButtonLink>
          </div>
        )}
      </div>
      <p className="mt-5 text-center text-sm text-body">
        Compare all three plans —{" "}
        <Link href="/membership" className="font-bold text-forest underline">
          {plans.map((p) => p.name).join(", ")}
        </Link>
        .
      </p>
    </div>
  );
}
