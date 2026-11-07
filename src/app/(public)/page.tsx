import Link from "next/link";
import { Icon, type IconName } from "@/components/icons";
import { PlanCards } from "@/components/public/plan-cards";
import { Container, CtaBand, FeaturedIn, Portrait, PublicHero, SectionHead } from "@/components/public/shell";
import { loadOpenSlots, visitorTimeZone, zoneLongName } from "@/lib/booking";
import { getPlans, getVisitTypes } from "@/lib/care";
import { dayKey, fmt, fmtTime, nowMs } from "@/lib/time";

export default async function HomePage() {
  const [visitTypes, plans, tz] = await Promise.all([getVisitTypes(), getPlans(), visitorTimeZone()]);
  const intro = visitTypes.find((v) => v.alwaysFree);
  const slots = intro ? await loadOpenSlots(intro, new Date(), 14) : [];
  const firstDay = slots[0] ? dayKey(slots[0], tz) : null;
  const daySlots = firstDay ? slots.filter((s) => dayKey(s, tz) === firstDay).slice(0, 6) : [];
  const tomorrow = dayKey(new Date(nowMs() + 86400_000), tz);
  const dayLabel = daySlots[0] ? `${firstDay === tomorrow ? "Tomorrow" : fmt(daySlots[0], tz, "EEEE")} · ${fmt(daySlots[0], tz, "EEE d MMM")}` : null;

  return (
    <>
      <PublicHero>
        <div className="flex flex-wrap items-center gap-14 pb-20 pt-8 md:pb-28 md:pt-14">
          <div className="min-w-0 flex-[1_1_560px]">
            <div className="inline-flex items-center gap-2.5 rounded-full border border-[#E1ECE6] bg-white py-[7px] pl-2.5 pr-3.5 text-[13px] font-semibold text-forest">
              <span className="size-2 rounded-full bg-coral" />
              Houston &nbsp;·&nbsp; Lagos &nbsp;·&nbsp; Online
            </div>
            <h1 className="h-display mt-7 text-[52px] leading-[.98] tracking-[-.025em] md:text-[84px]">
              Healthy living that <em className="italic text-forest">honours</em> who you are.
            </h1>
            <p className="mt-7 max-w-[540px] text-[19px] text-body-2">
              Virtual obesity, lifestyle and internal medicine care for African families — plans built around your culture, your food and your faith.
            </p>
            <div className="mt-10 flex flex-wrap gap-3.5">
              <Link href="/portal/book?type=intro" className="inline-flex items-center gap-2.5 rounded-full bg-forest px-7 py-4 font-bold text-white">
                Book a free intro call <Icon name="arrow" size={18} strokeWidth={2.2} />
              </Link>
              <Link href="/membership" className="inline-flex items-center gap-2.5 rounded-full border-[1.5px] border-ink px-7 py-4 font-bold">
                See membership
              </Link>
            </div>
            <div className="mt-11 flex flex-wrap gap-7 text-sm text-body-2">
              {["No app to install", "Times in your own time zone", "Cancel anytime"].map((t) => (
                <span key={t} className="flex items-center gap-2">
                  <Icon name="check" size={17} strokeWidth={2.4} className="text-forest" />
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div className="w-full min-w-0 max-w-[480px] flex-[1_1_400px]">
            <div className="relative rounded-[28px] border border-[#E1ECE6] bg-white p-[30px] shadow-[0_30px_60px_-28px_rgba(23,96,75,.45)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[12px] font-bold uppercase tracking-[.14em] text-forest">Next available</div>
                  <div className="mt-1.5 font-display text-[30px] leading-[1.15]">Intro call</div>
                </div>
                <span className="rounded-full bg-gold-tint px-[13px] py-[7px] text-[13px] font-bold text-gold-ink">Free · 15 min</span>
              </div>
              <div className="my-[22px] h-px bg-[#E6E8EC]" />
              {dayLabel ? (
                <>
                  <div className="mb-3 text-sm font-semibold text-[#5A6272]">{dayLabel}</div>
                  <div className="grid grid-cols-3 gap-2.5">
                    {daySlots.map((s, i) => (
                      <Link
                        key={s.toISOString()}
                        href={`/portal/book?type=intro&slot=${s.toISOString()}`}
                        className={i === 1 ? "rounded-[14px] bg-forest py-[13px] text-center font-semibold text-white" : "rounded-[14px] border border-field py-[13px] text-center font-semibold hover:border-forest"}
                      >
                        {fmtTime(s, tz)}
                      </Link>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-sm text-[#5A6272]">New times open soon. Create an account and we will email you.</div>
              )}
              <Link href="/portal/book?type=intro" className="mt-[22px] block rounded-[14px] bg-forest p-4 text-center font-bold text-white">
                Continue to book
              </Link>
              <div className="mt-3.5 text-center text-[13px] text-[#5A6272]">Shown in your time zone · {zoneLongName(tz)}</div>
            </div>
          </div>
        </div>
      </PublicHero>

      <FeaturedIn />

      <Container className="pt-20 md:pt-[110px]">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <div className="max-w-[660px]">
            <div className="text-[13px] font-bold uppercase tracking-[.16em] text-forest">Our approach</div>
            <h2 className="h-display mt-4 text-[40px] md:text-[56px]">Care that fits your life, not the other way around.</h2>
          </div>
          <p className="max-w-[380px] text-[#4A5262]">Jollof, egusi, garri, pounded yam — we build the plan around the foods your family actually eats.</p>
        </div>
        <div className="mt-14 grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(250px,1fr))]">
          {(
            [
              ["bg-sage", "text-forest", "heart", "Culturally rooted", "Meal and movement plans that respect your traditions instead of replacing them."],
              ["bg-gold-tint", "text-gold-ink", "sparkle", "Faith-centered", "Whole-person care that honours prayer, community and purpose."],
              ["bg-coral-tint", "text-coral-ink", "home", "Whole-family habits", "Practical routines for busy mums and households, with steps you can keep."],
              ["bg-sky-tint", "text-sky", "doc", "Evidence-based", "Obesity, lifestyle and internal medicine training behind every recommendation."],
            ] as [string, string, IconName, string, string][]
          ).map(([bg, fg, icon, title, body]) => (
            <div key={title} className={`${bg} rounded-3xl p-[30px]`}>
              <div className={`flex size-12 items-center justify-center rounded-[14px] bg-white ${fg}`}>
                <Icon name={icon} size={22} />
              </div>
              <h3 className="mb-2 mt-[22px] font-display text-[26px] font-medium">{title}</h3>
              <p className="text-[15.5px] text-body-2">{body}</p>
            </div>
          ))}
        </div>
      </Container>

      <div className="mt-20 bg-sage md:mt-[110px]">
        <Container className="pb-20 pt-20 md:pb-[110px] md:pt-[100px]">
          <div className="text-[13px] font-bold uppercase tracking-[.16em] text-forest">How it works</div>
          <h2 className="h-display mt-4 text-[40px] md:text-[56px]">From first hello to a plan you can follow.</h2>
          <div className="mt-16 grid border-t border-sage-line [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
            {[
              ["01", "text-forest", "Create your account", "A short, secure intake about your history and goals."],
              ["02", "text-gold", "Book a visit", "Pick a time in your own time zone — Houston, Lagos or between."],
              ["03", "text-coral", "Meet by video", "A private visit from your phone or laptop. Nothing to install."],
              ["04", "text-sky", "Stay supported", "Message Dr. Oparaji between visits and follow your care plan."],
            ].map(([n, c, t, b], i) => (
              <div key={n} className={`pb-6 pr-7 pt-[34px] ${i ? "md:pl-7" : ""} ${i < 3 ? "md:border-r md:border-sage-line" : ""}`}>
                <div className={`font-display text-[56px] leading-none ${c}`}>{n}</div>
                <h3 className="mb-2 mt-[22px] text-xl font-bold">{t}</h3>
                <p className="text-[15.5px] text-body-2">{b}</p>
              </div>
            ))}
          </div>
        </Container>
      </div>

      <Container className="pt-20 md:pt-[110px]">
        <SectionHead center eyebrow="Membership" title="Ongoing care, a message away." lead="Included visits, secure messaging and member pricing. Cancel any time." />
        <div className="mt-[60px]">
          <PlanCards plans={plans} />
        </div>
        <p className="mt-[26px] text-center text-[13px] text-[#5A6272]">Prices are illustrative until confirmed by the practice.</p>
      </Container>

      <Container className="pt-20 md:pt-[110px]">
        <div className="flex flex-wrap items-center gap-16">
          <div className="max-w-[480px] flex-[1_1_380px]">
            <Portrait />
          </div>
          <div className="flex-[1_1_440px]">
            <div className="text-[13px] font-bold uppercase tracking-[.16em] text-forest">Meet your doctor</div>
            <h2 className="h-display mt-4 text-[40px] md:text-[52px]">Dr. Nneoma Oparaji, MD, MHS</h2>
            <p className="mt-6 text-body-2">
              Physician focused on obesity medicine, lifestyle medicine and internal medicine, serving African families in Houston, Texas and Lagos, Nigeria — and a speaker whose work has reached national audiences.
            </p>
            <p className="mt-4 text-body-2">Her approach is simple: lasting health starts with respect for your culture, your food and your faith.</p>
            <div className="mt-8 flex flex-wrap gap-3.5">
              <Link href="/portal/book?type=intro" className="inline-flex items-center gap-2.5 rounded-full bg-forest px-7 py-4 font-bold text-white">
                Book an intro call
              </Link>
              <Link href="/about" className="inline-flex items-center gap-2.5 rounded-full border-[1.5px] border-ink px-7 py-4 font-bold">
                Read her story
              </Link>
            </div>
          </div>
        </div>
      </Container>

      <CtaBand />
    </>
  );
}
