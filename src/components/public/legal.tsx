import { Container, PublicHero } from "./shell";

/** Boards 02.8–02.10: numbered sections with an "On this page" index. */
export function LegalPage({ eyebrow, title, lead, sections }: { eyebrow: string; title: string; lead: string; sections: [string, string][] }) {
  return (
    <>
      <PublicHero eyebrow={eyebrow} title={title} lead={lead} />
      <Container className="pb-20 pt-16 md:pb-[110px] md:pt-[90px]">
        <div className="flex flex-wrap gap-12">
          <nav aria-label="On this page" className="flex-[0_1_260px]">
            <div className="sticky top-6 rounded-3xl bg-sage p-6">
              <div className="eyebrow">On this page</div>
              <ol className="mt-3 flex flex-col gap-2 text-[15px]">
                {sections.map(([h], i) => (
                  <li key={h}>
                    <a href={`#s${i + 1}`} className="hover:text-forest">
                      {i + 1}. {h}
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          </nav>
          <div className="min-w-0 max-w-[760px] flex-[1_1_480px]">
            <div className="mb-10 rounded-2xl bg-gold-tint px-5 py-4 text-sm text-[#5B4210]">Draft wording for review by the practice’s legal counsel. Last updated 25 October 2026.</div>
            {sections.map(([h, b], i) => (
              <section key={h} id={`s${i + 1}`} className="mb-10 scroll-mt-6">
                <h2 className="font-display text-[30px]">
                  {i + 1}. {h}
                </h2>
                <p className="mt-3 text-body-2">{b}</p>
              </section>
            ))}
          </div>
        </div>
      </Container>
    </>
  );
}
