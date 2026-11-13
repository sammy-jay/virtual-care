import Link from "next/link";
import type { Metadata } from "next";
import { Icon } from "@/components/icons";
import { Container, PublicHero } from "@/components/public/shell";
import { DOCTOR } from "@/lib/doctor-profile";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <>
      <PublicHero eyebrow="Contact" title="We would love to hear from you." lead="Questions about visits, membership or the practice? Send a note and we will reply within one business day." />
      <Container className="pb-20 pt-16 md:pb-[110px] md:pt-[90px]">
        <div className="flex flex-wrap gap-10 md:gap-14">
          <div className="min-w-0 flex-[1_1_520px]">
            <h2 className="h-display text-[40px]">Send a message</h2>
            <p className="mb-[26px] mt-2 text-[#4A5262]">We reply within 1 business day. Please do not include medical details.</p>
            <ContactForm />
          </div>
          <div className="flex min-w-0 max-w-[440px] flex-[1_1_360px] flex-col gap-4">
            <div className="rounded-3xl bg-sage px-7 py-[26px]">
              <div className="eyebrow">Houston</div>
              <div className="mt-2 font-display text-[26px] leading-[1.2]">Mon–Fri · 9 AM – 5 PM CDT</div>
              <div className="mt-1 text-[15px] text-body-2">Practice time zone</div>
            </div>
            <div className="rounded-3xl bg-gold-tint px-7 py-[26px]">
              <div className="eyebrow !text-gold-ink">Lagos</div>
              <div className="mt-2 font-display text-[26px] leading-[1.2]">Mon–Fri · 3 PM – 11 PM WAT</div>
              <div className="mt-1 text-[15px] text-body-2">Same hours, shown in WAT</div>
            </div>
            <Link href="/portal/book?type=intro" className="rounded-3xl bg-sky-tint px-7 py-[26px]">
              <div className="eyebrow !text-sky">Prefer to talk?</div>
              <div className="mt-2 font-display text-[26px] leading-[1.2]">Book a free intro call</div>
              <div className="mt-1 text-[15px] text-body-2">15 minutes by secure video</div>
            </Link>
            <div className="rounded-3xl border border-line px-7 py-[26px]">
              <div className="eyebrow">Media, speaking & partnerships</div>
              <a href={`mailto:${DOCTOR.email}`} className="mt-2 block break-all font-display text-[22px] leading-[1.2] hover:text-forest">
                {DOCTOR.email}
              </a>
              <div className="mt-3 flex gap-4 text-[15px] font-semibold text-forest">
                <a href={DOCTOR.instagram} target="_blank" rel="noopener noreferrer">Instagram</a>
                <a href={DOCTOR.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>
              </div>
            </div>
            <div className="flex gap-4 rounded-3xl bg-coral-tint px-7 py-[26px]">
              <div className="flex size-11 flex-none items-center justify-center rounded-[14px] bg-white text-coral-ink">
                <Icon name="alert" size={22} />
              </div>
              <div>
                <div className="font-bold">In an emergency</div>
                <div className="mt-0.5 text-[15px] text-body-2">Do not use this form. Call 911 (US) or 112 / 767 (Nigeria).</div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </>
  );
}
