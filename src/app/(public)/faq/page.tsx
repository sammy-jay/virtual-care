import Link from "@/components/market";
import type { Metadata } from "next";
import { Container, PublicHero } from "@/components/public/shell";
import { FaqList } from "./faq-list";

export const metadata: Metadata = { title: "FAQ" };

export default function FaqPage() {
  return (
    <>
      <PublicHero eyebrow="FAQ" title="Questions, answered." lead="Everything to know before your first visit." />
      <Container className="pb-20 pt-16 md:pb-[110px] md:pt-[90px]">
        <FaqList />
        <div className="mt-[72px] flex flex-wrap items-center justify-between gap-6 rounded-[28px] bg-gold-tint px-7 py-10 md:px-11">
          <div>
            <h3 className="font-display text-[32px] font-medium">Did not find your answer?</h3>
            <p className="mt-2 text-[#5B4210]">Send us a message — we reply within 1 business day.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/contact" className="inline-flex rounded-full bg-forest px-7 py-4 font-bold text-white">
              Contact us
            </Link>
            <Link href="/portal/book?type=intro" className="inline-flex rounded-full border-[1.5px] border-ink px-7 py-4 font-bold">
              Book an intro call
            </Link>
          </div>
        </div>
      </Container>
    </>
  );
}
