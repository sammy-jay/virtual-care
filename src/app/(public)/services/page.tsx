import Link from "@/components/market";
import type { Metadata } from "next";
import { Icon } from "@/components/icons";
import { Container, CtaBand, PublicHero, SectionHead } from "@/components/public/shell";
import { getPlans, getPractice, getVisitTypes } from "@/lib/care";
import { moneyShort } from "@/lib/format";
import { getMarket } from "@/lib/market-server";

export const metadata: Metadata = { title: "Services" };
// Prices come from the database and change in doctor Settings.
export const dynamic = "force-dynamic";

const TINTS = [
  ["bg-sage", "text-forest"],
  ["bg-gold-tint", "text-gold-ink"],
  ["bg-sky-tint", "text-sky"],
  ["bg-coral-tint", "text-coral-ink"],
];

export default async function ServicesPage() {
  const [types, plans, market, practice] = await Promise.all([getVisitTypes(), getPlans(), getMarket(), getPractice()]);
  // Visits are billed in USD; the Nigeria site adds an approximate naira figure.
  const approxNgn = (cents: number) => moneyShort(Math.round((cents * practice.ngnPerUsd) / 100 / 500) * 500 * 100, "NGN");
  const thrive = plans.find((p) => p.popular);
  const badge = (slug: string, id: string) => {
    if (slug === "intro") return "Free";
    if (slug === "initial-consultation") return "Most thorough";
    if (slug === "family-coaching") return "Whole household";
    if (thrive?.includedVisitTypeIds.includes(id)) return `Included with ${thrive.name}`;
    return null;
  };
  // Order as drawn: intro, initial, follow-up, coaching
  const order = ["intro", "initial-consultation", "follow-up", "family-coaching"];
  const rank = (slug: string) => (order.includes(slug) ? order.indexOf(slug) : 99);
  const sorted = [...types].sort((a, b) => rank(a.slug) - rank(b.slug));

  return (
    <>
      <PublicHero eyebrow="Services" title="Visits designed around real life." lead="Four ways to meet with Dr. Oparaji — all by secure video, all booked in your own time zone." />

      <Container className="pt-20 md:pt-[110px]">
        <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
          {sorted.map((t, i) => {
            const [bg, fg] = TINTS[i % TINTS.length];
            const b = badge(t.slug, t.id);
            return (
              <div key={t.id} className={`${bg} flex flex-col rounded-3xl p-[30px]`}>
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[12px] font-extrabold uppercase tracking-[.12em] ${fg}`}>{t.durationMin} min</span>
                  {b && <span className={`rounded-full bg-white px-[11px] py-[5px] text-[12px] font-bold ${fg}`}>{b}</span>}
                </div>
                <h3 className="mb-2 mt-[18px] font-display text-[28px] font-medium">{t.name}</h3>
                <p className="flex-1 text-[15.5px] text-body-2">{t.tagline}</p>
                <div className="mt-6 flex items-center justify-between">
                  <span>
                    <span className="block font-display text-[36px] leading-tight">{t.alwaysFree ? "Free" : moneyShort(t.priceCents)}</span>
                    {market === "ng" && !t.alwaysFree && <span className="num block text-[13px] text-body">about {approxNgn(t.priceCents)}</span>}
                  </span>
                  <Link href={t.alwaysFree ? "/portal/book?type=intro" : `/portal/book?type=${t.slug}`} className="rounded-full bg-forest px-5 py-3 text-sm font-bold text-white">
                    Book
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </Container>

      <Container className="pt-20 md:pt-[110px]">
        <div className="flex flex-wrap gap-16">
          <div className="flex-[1_1_380px]">
            <SectionHead eyebrow="What we help with" title="Whole-person care for everyday conditions." lead="Plans always begin with your own foods, schedule and faith — never a one-size-fits-all diet." />
          </div>
          <ul className="flex-[1_1_440px] border-t border-[#E6E8EC]">
            {[
              "Weight and obesity care",
              "Type 2 diabetes and prediabetes",
              "High blood pressure",
              "High cholesterol",
              "Fatty liver",
              "PCOS and hormone-related weight gain",
              "Sleep, stress and energy",
              "Post-pregnancy wellness",
              "Family and children’s habits",
            ].map((c) => (
              <li key={c} className="flex gap-3 border-b border-[#E6E8EC] py-4">
                <Icon name="check" size={18} strokeWidth={2.4} className="mt-1 text-forest" />
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      </Container>

      <div className="mt-20 bg-gold-tint md:mt-[110px]">
        <Container className="py-20 md:py-[100px]">
          <SectionHead eyebrow="What a visit looks like" title="Simple before, during and after." />
          <div className="mt-14 grid border-t border-gold-line [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
            {[
              ["01", "text-forest", "Before", "Complete a short health profile and choose your time. Reminders are sent in your own time zone."],
              ["02", "text-gold", "During", "A private video visit — no download needed. Dr. Oparaji reviews your goals and builds the plan with you."],
              ["03", "text-coral", "After", "Your written care plan appears in the portal. Message between visits if you are a member."],
            ].map(([n, c, t, b]) => (
              <div key={n} className="pr-7 pt-[30px]">
                <div className={`font-display text-[44px] leading-none ${c}`}>{n}</div>
                <h3 className="mb-2 mt-[18px] text-xl font-bold">{t}</h3>
                <p className="text-[15.5px] text-body-2">{b}</p>
              </div>
            ))}
          </div>
        </Container>
      </div>

      <CtaBand />
    </>
  );
}
