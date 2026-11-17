import Link from "@/components/market";
import type { Metadata } from "next";
import { Container, CtaBand, FeaturedIn, Portrait, PublicHero, SectionHead } from "@/components/public/shell";
import { Icon } from "@/components/icons";
import { DOCTOR, portfolio } from "@/lib/doctor-profile";
import { getLicensure } from "@/lib/licensure";
import { getMarket } from "@/lib/market-server";
import { LicensureMap } from "@/components/public/licensure-map";

export const metadata: Metadata = {
  title: "About",
  description: `${DOCTOR.name}, ${DOCTOR.postnominals}: board certified in internal, obesity and lifestyle medicine. Virtual care across the United States and Nigeria.`,
};

const FOCUS = [
  ["bg-sage", "bg-forest", "Obesity medicine", "Clinical focus on sustainable weight care, including medications such as GLP-1s when they fit."],
  ["bg-gold-tint", "bg-gold-ink", "Lifestyle medicine", "Food, movement, sleep and stress as treatment, not afterthoughts."],
  ["bg-coral-tint", "bg-coral-ink", "Internal medicine", "Whole-adult care for blood sugar, blood pressure, cholesterol and more."],
  ["bg-sky-tint", "bg-sky", "Public health", "Johns Hopkins MHS-trained, with a focus on prevention and community."],
] as const;

const VALUES = [
  ["01", "text-forest", "Faith-centered", "Prayer, purpose and community belong in the plan."],
  ["02", "text-gold", "Culturally rooted", "We build on the foods and traditions you love, not against them."],
  ["03", "text-coral", "Evidence-based", "Every recommendation stands on current clinical guidelines."],
  ["04", "text-sky", "Practical", "Habits sized for real family life and busy mums, not fad diets."],
] as const;

export default async function AboutPage() {
  const [market, { states }] = await Promise.all([getMarket(), getLicensure()]);
  const ng = market === "ng";
  const stats: (readonly [string, string])[] = [DOCTOR.stats[0], DOCTOR.stats[1], ng ? ["2", "Countries: US & Nigeria"] : [String(states.length), "US states licensed"]];
  return (
    <>
      <PublicHero eyebrow="About" title="Care rooted in faith, culture and family." lead="Meet the physician behind the practice." />

      <Container className="pt-20 md:pt-[110px]">
        <div className="flex flex-wrap items-center gap-16">
          <div className="max-w-[480px] flex-[1_1_380px]">
            <Portrait variant="seated" />
          </div>
          <div className="flex-[1_1_440px]">
            <SectionHead eyebrow="Her story" title="Medicine that listens first." />
            <div className="num mt-3 text-[15px] font-semibold tracking-wide text-forest">
              {DOCTOR.name}, {DOCTOR.postnominals}
            </div>
            <p className="mt-6 text-body-2">
              Board certified in internal, obesity and lifestyle medicine and trained across Nigeria and the United States, and fluent in {DOCTOR.languages.join(" and ")}, Dr. Oparaji built this virtual-only practice for African families who want care that respects their food, faith and culture.
            </p>
            <a href={portfolio("/about")} className="mt-3 inline-flex items-center gap-1.5 font-bold text-forest hover:text-forest-deep">
              Read the full story <Icon name="arrow" size={16} strokeWidth={2.2} />
            </a>
            <div className="mt-8 flex flex-wrap gap-3.5">
              <Link href="/portal/book?type=intro" className="inline-flex rounded-full bg-forest px-7 py-4 font-bold text-white">
                Book an intro call
              </Link>
              <Link href="/contact" className="inline-flex rounded-full border-[1.5px] border-ink px-7 py-4 font-bold">
                Ask a question
              </Link>
            </div>
          </div>
        </div>
      </Container>

      <Container className="pt-16">
        <dl className="grid gap-px overflow-hidden rounded-3xl border border-line bg-line sm:grid-cols-3">
          {stats.map(([n, l]) => (
            <div key={l} className="bg-white px-7 py-6">
              <dt className="sr-only">{l}</dt>
              <dd className="num font-display text-[44px] leading-none text-forest">{n}</dd>
              <dd className="mt-2 text-[15px] text-body-2">{l}</dd>
            </div>
          ))}
        </dl>
      </Container>

      <div className="mt-20">
        <FeaturedIn />
      </div>

      <Container className="pt-20 md:pt-[110px]">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <div className="text-[13px] font-bold uppercase tracking-[.16em] text-forest">Mission</div>
            <p className="h-display mt-4 text-[28px] leading-[1.2] md:text-[34px]">{DOCTOR.mission}</p>
          </div>
          <div>
            <div className="text-[13px] font-bold uppercase tracking-[.16em] text-gold-ink">Vision</div>
            <p className="h-display mt-4 text-[28px] leading-[1.2] md:text-[34px]">{DOCTOR.vision}</p>
          </div>
        </div>
      </Container>

      <Container className="pt-20 md:pt-[110px]">
        <SectionHead eyebrow="Training and focus" title="Evidence-based, always." />
        <div className="mt-12 grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
          {FOCUS.map(([bg, dot, t, b]) => (
            <div key={t} className={`${bg} rounded-3xl p-7`}>
              <div className={`size-2.5 rounded-full ${dot}`} />
              <h3 className="mt-3.5 font-display text-2xl font-medium">{t}</h3>
              <p className="mt-2 text-[15px] text-body-2">{b}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 grid gap-10 border-t border-line pt-10 md:grid-cols-2">
          <div>
            <h3 className="text-lg font-bold">Board certifications</h3>
            <ul className="mt-4 space-y-3">
              {DOCTOR.boards.map((b) => (
                <li key={b.short} className="flex items-baseline gap-3">
                  <span className="w-14 flex-none text-[13px] font-extrabold tracking-wide text-forest">{b.short}</span>
                  <span className="text-body-2">{b.name}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-bold">Education</h3>
            <ul className="mt-4 space-y-3">
              {DOCTOR.education.map((e) => (
                <li key={e.school}>
                  <div className="font-semibold">{e.school}</div>
                  <div className="text-[15px] text-body-2">{e.detail}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
        {ng ? (
          <p className="mt-8 text-[13px] text-[#5A6272]">Registered with the Medical and Dental Council of Nigeria. Your location is confirmed when you book.</p>
        ) : (
          <div className="mt-14 border-t border-line pt-12">
            <h3 className="text-lg font-bold">Where she can see you</h3>
            <p className="mt-1.5 max-w-[620px] text-[15px] text-body-2">
              Licensed in {states.length} US states. Visits happen by video, so you only need to be in one of these states at the time of your visit.
            </p>
            <div className="mt-8 max-w-[900px]">
              <LicensureMap states={states} />
            </div>
          </div>
        )}
      </Container>

      <div className="mt-20 bg-sage md:mt-[110px]">
        <Container className="py-20 md:py-[100px]">
          <SectionHead eyebrow="What we believe" title="Four values behind every plan." />
          <div className="mt-14 grid border-t border-sage-line [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
            {VALUES.map(([n, c, t, b]) => (
              <div key={n} className="pr-7 pt-[34px]">
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
