import Image from "next/image";
import Link from "@/components/market";
import type { ReactNode } from "react";
import { DOCTOR, PORTFOLIO_HOST, portfolio } from "@/lib/doctor-profile";
import { getLicensure } from "@/lib/licensure";
import { getMarket } from "@/lib/market-server";
import { Dot, EmergencyBar, Logo, Monogram } from "@/components/brand";
import { Icon } from "@/components/icons";
import { ButtonLink } from "@/components/ui";
import { MobileMenu, NavLinks } from "./nav-links";
import { PUBLIC_NAV } from "./nav-items";
import { SiteToggle } from "./site-toggle";

export const Container = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={`mx-auto w-full max-w-[1240px] px-4 sm:px-10 ${className}`}>{children}</div>
);

export async function PublicNav() {
  const market = await getMarket();
  return (
    <nav className="flex items-center justify-between gap-6 py-3.5 md:py-[18px]">
      <div className="flex min-w-0 items-center gap-4">
        <Logo subtitle={market === "ng" ? "Virtual care · Nigeria" : "Virtual care"} />
        {/* Hidden at lg–xl, where the centre links leave no room for it; the menu carries it below lg. */}
        <a href={portfolio()} className="hidden whitespace-nowrap border-l border-sage-line pl-4 text-[13px] font-semibold text-sage-ink hover:text-forest sm:inline lg:hidden xl:inline">
          ← {PORTFOLIO_HOST}
        </a>
      </div>
      <NavLinks className="hidden gap-[34px] text-[15px] font-medium text-body-2 lg:flex" />
      <div className="hidden items-center gap-2.5 sm:flex">
        <Link href="/sign-in" className="rounded-full border-[1.5px] border-ink px-[18px] py-[11px] text-sm font-semibold">
          Sign in
        </Link>
        <Link href="/sign-up" className="rounded-full bg-forest px-5 py-[11px] text-sm font-bold text-white">
          Get started
        </Link>
      </div>
      <MobileMenu className="lg:hidden">
        {PUBLIC_NAV.map((l) => (
          <Link key={l.href} href={l.href} className="rounded-xl px-3 py-2.5 font-semibold hover:bg-sage">
            {l.label}
          </Link>
        ))}
        <a href={portfolio()} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-sage-ink hover:bg-sage">
          ← {PORTFOLIO_HOST}
        </a>
        <div className="mt-2 flex gap-2 border-t border-line pt-3">
          <ButtonLink href="/sign-in" variant="outline" size="sm" className="flex-1">
            Sign in
          </ButtonLink>
          <ButtonLink href="/sign-up" size="sm" className="flex-1">
            Get started
          </ButtonLink>
        </div>
      </MobileMenu>
    </nav>
  );
}

/** Sticky site header: stays on top while scrolling, above every page section. */
export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[#EFE4CF] bg-sand/90 backdrop-blur-md supports-[backdrop-filter]:bg-sand/80">
      <Container>
        <PublicNav />
      </Container>
    </header>
  );
}

/** Sand hero band with decorative circles (top of every public page; the header sits above it). */
export function PublicHero({ eyebrow, title, lead, children }: { eyebrow?: string; title?: ReactNode; lead?: ReactNode; children?: ReactNode }) {
  return (
    <div className="relative overflow-hidden bg-sand text-ink">
      <div aria-hidden="true" className="pointer-events-none absolute -right-[60px] -top-[50px] hidden h-[520px] w-[560px] md:block">
        <Dot className="right-10 top-0 size-[400px] bg-sage" />
        <Dot className="right-[300px] top-[260px] size-[210px] bg-gold opacity-90" />
        <Dot className="right-5 top-[330px] size-[140px] bg-coral" />
        <Dot className="right-[230px] top-[60px] size-[90px] border-[10px] border-sky" />
      </div>
      <Container className="relative">
        {children ?? (
          <div className="max-w-[760px] pb-20 pt-10 md:pb-24 md:pt-[60px]">
            {eyebrow && (
              <div className="inline-flex items-center gap-2.5 text-[13px] font-bold uppercase tracking-[.16em] text-forest">
                <span className="h-[3px] w-7 rounded-sm bg-gold" />
                {eyebrow}
              </div>
            )}
            <h1 className="h-display mt-[18px] text-[46px] leading-none tracking-[-.025em] md:text-[72px]">{title}</h1>
            {lead && <p className="mt-6 max-w-[560px] text-[19px] text-body-2">{lead}</p>}
          </div>
        )}
      </Container>
    </div>
  );
}

export function SectionHead({ eyebrow, title, lead, center }: { eyebrow: string; title: ReactNode; lead?: ReactNode; center?: boolean }) {
  return (
    <div className={center ? "mx-auto max-w-[720px] text-center" : "max-w-[660px]"}>
      <div className="text-[13px] font-bold uppercase tracking-[.16em] text-forest">{eyebrow}</div>
      <h2 className="h-display mt-4 text-[38px] md:text-[48px]">{title}</h2>
      {lead && <p className="mt-[18px] text-[#4A5262]">{lead}</p>}
    </div>
  );
}

/** [name, file in /public/as_seen_in, intrinsic width, intrinsic height, display height px] — heights tuned so marks read at equal weight. */
const OUTLETS: [string, string, number, number, number][] = [
  ["NBC News", "nbc_news.png", 544, 89, 22],
  ["The Washington Post", "washington_post.svg", 463, 72, 22],
  ["USA Today", "usa-today.png", 411, 99, 24],
  ["Fox News", "fox_news.png", 960, 960, 36],
  ["Yahoo", "yahoo.png", 240, 72, 26],
  ["HuffPost", "HuffPost.png", 960, 113, 16],
  ["MSN", "msn.png", 512, 201, 30],
  ["New York Post", "ny_post.svg", 370, 50, 19],
  ["U.S. News & World Report", "usn.png", 442, 114, 23],
  ["Medscape", "medscape.jpg", 3840, 907, 24],
  ["Parade", "parade.svg", 233, 50, 19],
  ["AOL", "aol.png", 400, 400, 56],
  ["Delish", "delish.jpg", 1224, 344, 24],
  ["EatingWell", "eating_well.jpg", 200, 61, 28],
  ["Everyday Health", "everyday.png", 291, 173, 36],
  ["HealthCentral", "health_central.png", 600, 71, 19],
  ["SingleCare", "single_care.png", 999, 164, 22],
];

/** `top` keeps only the first N outlets (the list is ordered by prominence). */
export function FeaturedIn({ top }: { top?: number }) {
  const outlets = top ? OUTLETS.slice(0, top) : OUTLETS;
  return (
    <section aria-labelledby="featured-in" className="border-y border-[#E6E8EC] bg-white">
      <Container className="py-10 md:py-12">
        <h2 id="featured-in" className="text-center text-[12px] font-bold uppercase tracking-[.16em] text-[#5A6272]">
          As featured in
        </h2>
        <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-7 md:gap-x-14">
          {outlets.map(([name, file, w, h, height]) => (
            <li key={name} className="flex items-center">
              <Image
                src={`/as_seen_in/${file}`}
                alt={name}
                width={w}
                height={h}
                sizes={`${Math.ceil((height * w) / h)}px`}
                style={{ height, width: "auto" }}
                className="block"
              />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

const PORTRAITS = {
  studio: { src: "/images/dr-oparaji.jpeg", position: "50% 20%" },
  seated: { src: "/images/dr-oparaji-2.jpeg", position: "50% 35%" },
} as const;

export function Portrait({ variant = "studio", caption }: { variant?: keyof typeof PORTRAITS; caption?: ReactNode }) {
  const p = PORTRAITS[variant];
  return (
    <figure className="relative aspect-[4/5] overflow-hidden rounded-[32px] bg-sage">
      <Image
        src={p.src}
        alt={`${DOCTOR.name}, ${DOCTOR.postnominals}`}
        fill
        sizes="(min-width: 1024px) 480px, 100vw"
        className="object-cover"
        style={{ objectPosition: p.position }}
        priority={variant === "studio"}
      />
      {caption && (
        <figcaption className="absolute inset-x-4 bottom-4 rounded-2xl bg-white/92 px-5 py-4 text-[14px] leading-snug text-ink shadow-sm backdrop-blur">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

export function CtaBand() {
  return (
    <Container className="pb-20 pt-20 md:pb-[110px] md:pt-[110px]">
      <div className="relative overflow-hidden rounded-[36px] bg-forest px-6 py-14 text-center text-white md:px-12 md:py-[72px]">
        <Dot className="-bottom-20 -left-[60px] size-[240px] bg-forest-deep" />
        <Dot className="-top-[50px] right-[60px] size-[150px] bg-gold" />
        <Dot className="bottom-[30px] right-[230px] size-14 bg-coral" />
        <h2 className="h-display relative text-[36px] md:text-[52px]">Ready for a plan that feels like home?</h2>
        <p className="relative mx-auto mt-[18px] max-w-[480px] text-white/80">Create a free account in two minutes and book your intro call.</p>
        <Link href="/sign-up" className="relative mt-[34px] inline-flex rounded-full bg-gold px-8 py-[17px] font-bold text-ink">
          Get started
        </Link>
      </div>
    </Container>
  );
}

export async function PublicFooter() {
  const market = await getMarket();
  const { states } = await getLicensure();
  // Virtual-only practice: describe reach, never a city.
  const reach = market === "ng" ? "Virtual care for patients across Nigeria" : `Virtual-only practice · licensed in ${states.length} US states`;
  return (
    <footer className="flex flex-1 flex-col bg-sage text-sm text-sage-ink">
      <Container className="flex flex-wrap justify-between gap-10 py-14">
        <div className="max-w-[340px]">
          <div className="mb-5 flex items-center gap-4">
            <Monogram size={60} />
            <p className="text-[11px] font-semibold uppercase leading-[1.6] tracking-[.18em] text-ink">
              Faith. Culture.
              <br />
              Evidence-based health.
            </p>
          </div>
          <div className="font-display text-[22px] text-ink">Dr. Nneoma Oparaji</div>
          <p className="mt-2.5">Faith-centered, culturally rooted virtual care for African families.</p>
          <p className="mt-2.5 text-[13px]">{DOCTOR.postnominals}</p>
          <p className="mt-1 text-[13px]">{reach}</p>
        </div>
        <div className="flex flex-col gap-2.5">
          <span className="font-extrabold text-forest">Connect</span>
          <a href={`mailto:${DOCTOR.email}`} className="hover:text-ink">{DOCTOR.email}</a>
          <a href={DOCTOR.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-ink">Instagram</a>
          <a href={DOCTOR.linkedin} target="_blank" rel="noopener noreferrer" className="hover:text-ink">LinkedIn</a>
        </div>
        <div className="flex flex-col gap-2.5">
          <a href={portfolio()} className="font-extrabold text-forest hover:text-forest-deep">
            {PORTFOLIO_HOST}
          </a>
          <a href={portfolio("/media")} className="hover:text-ink">Media</a>
          <a href={portfolio("/about")} className="hover:text-ink">About Dr. Oparaji</a>
          <a href={portfolio("/contact")} className="hover:text-ink">Press &amp; partnerships</a>
        </div>
        <div className="flex flex-wrap gap-14">
          <div className="flex flex-col gap-2.5">
            <span className="font-extrabold text-forest">Practice</span>
            {PUBLIC_NAV.map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-ink">
                {l.label}
              </Link>
            ))}
          </div>
          <div className="flex flex-col gap-2.5">
            <span className="font-extrabold text-forest">Legal</span>
            <Link href="/privacy" className="hover:text-ink">Privacy</Link>
            <Link href="/terms" className="hover:text-ink">Terms</Link>
            <Link href="/telehealth-consent" className="hover:text-ink">Telehealth consent</Link>
            <Link href="/?cookies=manage" className="hover:text-ink">Cookie preferences</Link>
          </div>
        </div>
      </Container>
      <Container className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4 border-t border-[#C9DDD3] py-[18px] text-[13px] text-[#4F6A5F]">
        <span>Information on this site is educational and is not a substitute for medical advice.</span>
        <SiteToggle />
      </Container>
    </footer>
  );
}

export async function PublicPage({ children }: { children: ReactNode }) {
  const market = await getMarket();
  return (
    <div className="flex min-h-screen flex-col bg-white text-[17px] leading-[1.55] text-ink">
      <EmergencyBar market={market} />
      <PublicHeader />
      {children}
    </div>
  );
}

export function Check({ light }: { light?: boolean }) {
  return <Icon name="check" size={18} strokeWidth={2.4} className={light ? "mt-0.5 text-gold" : "mt-0.5 text-forest"} />;
}
