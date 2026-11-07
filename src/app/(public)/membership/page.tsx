import type { Metadata } from "next";
import { PlanCards } from "@/components/public/plan-cards";
import { Container, CtaBand, PublicHero } from "@/components/public/shell";
import { getPlans } from "@/lib/care";

export const metadata: Metadata = { title: "Membership" };
// Prices come from the database and change in doctor Settings.
export const dynamic = "force-dynamic";

export default async function MembershipPage() {
  const plans = await getPlans();
  const yes = "✓";
  const no = "—";
  const rows: [string, (p: (typeof plans)[number]) => string][] = [
    ["Secure messaging", () => yes],
    ["Included visits per month", (p) => (p.includedVisits ? String(p.includedVisits) : no)],
    ["Member discount on visits", (p) => `${p.discountPct}%`],
    ["Priority scheduling", (p) => (p.includedVisits ? yes : no)],
    ["Family members covered", (p) => (p.maxFamilyMembers > 1 ? `Up to ${p.maxFamilyMembers}` : "1")],
    ["Pause or cancel any time", () => yes],
  ];

  return (
    <>
      <PublicHero eyebrow="Membership" title="Ongoing care, a message away." lead="Included visits, secure messaging and member pricing. Cancel any time." />

      <Container className="pt-20 md:pt-[110px]">
        <PlanCards plans={plans} />

        <div className="mt-20 overflow-x-auto rounded-[28px] border border-[#E6E8EC]">
          <table className="w-full min-w-[640px] border-collapse text-[15.5px]">
            <thead>
              <tr>
                <th className="border-b-2 border-forest px-5 py-[18px] text-left font-display text-[24px] font-normal">Compare plans</th>
                {plans.map((p) => (
                  <th key={p.id} className={`border-b-2 border-forest px-5 py-[18px] ${p.popular ? "bg-sage text-forest" : ""}`}>
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, value]) => (
                <tr key={label}>
                  <td className="border-b border-[#E6E8EC] px-5 py-[18px] font-semibold">{label}</td>
                  {plans.map((p) => (
                    <td key={p.id} className={`border-b border-[#E6E8EC] px-5 py-[18px] text-center ${p.popular ? "bg-sage font-bold text-forest" : ""}`}>
                      {value(p)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-10 flex flex-wrap gap-5">
          <div className="flex-[1_1_340px] rounded-3xl bg-gold-tint p-8">
            <h3 className="font-display text-[26px] font-medium">Paying from Nigeria?</h3>
            <p className="mt-2.5 text-[15.5px] text-body-2">Pay in naira by card or bank transfer. The amount is shown before you confirm, and receipts list both currencies.</p>
          </div>
          <div className="flex-[1_1_340px] rounded-3xl bg-coral-tint p-8">
            <h3 className="font-display text-[26px] font-medium">Change your mind?</h3>
            <p className="mt-2.5 text-[15.5px] text-body-2">Switch plans or cancel from your account at any time. Access continues until the end of the billing period.</p>
          </div>
        </div>
        <p className="mt-[26px] text-center text-[13px] text-[#5A6272]">Prices are illustrative until confirmed by the practice.</p>
      </Container>

      <CtaBand />
    </>
  );
}
