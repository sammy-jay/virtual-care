import Link from "next/link";
import type { Metadata } from "next";
import { Container, CtaBand, FeaturedIn, Portrait, PublicHero, SectionHead } from "@/components/public/shell";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <>
      <PublicHero eyebrow="About" title="Care rooted in faith, culture and family." lead="Meet the physician behind the practice." />

      <Container className="pt-20 md:pt-[110px]">
        <div className="flex flex-wrap items-center gap-16">
          <div className="max-w-[480px] flex-[1_1_380px]">
            <Portrait />
          </div>
          <div className="flex-[1_1_440px]">
            <SectionHead eyebrow="Her story" title="Medicine that listens first." />
            <p className="mt-6 text-body-2">
              Dr. Nneoma Oparaji is a physician serving African families in Houston, Texas and Lagos, Nigeria. She noticed that standard weight advice rarely fit the way her patients actually eat, worship and live.
            </p>
            <p className="mt-4 text-body-2">
              So she built a practice around respect: for culture, for food, for faith and for family — with the clinical rigour of obesity, lifestyle and internal medicine behind every recommendation.
            </p>
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

      <div className="mt-24">
        <FeaturedIn />
      </div>

      <Container className="pt-20 md:pt-[110px]">
        <SectionHead eyebrow="Training and focus" title="Evidence-based, always." />
        <div className="mt-12 grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
          {[
            ["bg-sage", "bg-forest", "Obesity medicine", "Clinical focus on sustainable weight care."],
            ["bg-gold-tint", "bg-gold-ink", "Lifestyle medicine", "Food, movement, sleep and stress as treatment."],
            ["bg-coral-tint", "bg-coral-ink", "Internal medicine", "Whole-adult care for common conditions."],
            ["bg-sky-tint", "bg-sky", "Public health", "MHS-trained, community minded."],
          ].map(([bg, dot, t, b]) => (
            <div key={t} className={`${bg} rounded-3xl p-7`}>
              <div className={`size-2.5 rounded-full ${dot}`} />
              <h3 className="mt-3.5 font-display text-2xl font-medium">{t}</h3>
              <p className="mt-2 text-[15px] text-body-2">{b}</p>
            </div>
          ))}
        </div>
        <p className="mt-5 text-[13px] text-[#5A6272]">Credentials and licensure details to be confirmed by the practice.</p>
      </Container>

      <div className="mt-20 bg-sage md:mt-[110px]">
        <Container className="py-20 md:py-[100px]">
          <SectionHead eyebrow="What we believe" title="Three ideas behind every plan." />
          <div className="mt-14 grid border-t border-sage-line [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
            {[
              ["01", "text-forest", "Culture is not the problem", "We build on the foods and traditions you love."],
              ["02", "text-gold", "Faith is part of health", "Prayer, purpose and community belong in the plan."],
              ["03", "text-coral", "Families change together", "Habits stick when the household shares them."],
            ].map(([n, c, t, b]) => (
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
