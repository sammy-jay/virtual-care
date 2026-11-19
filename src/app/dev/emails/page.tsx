import type { Metadata } from "next";
import NextLink from "next/link";
import { notFound } from "next/navigation";
import { renderEmail, SAMPLES, type Audience } from "@/lib/email/templates";
import type { Market } from "@/lib/market";

export const metadata: Metadata = { title: "Email templates", robots: { index: false } };

/** Development only: every email template with sample data. /dev/emails?t=welcome&m=ng */
export default async function EmailPreview({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { t, m } = await searchParams;
  const market: Market = m === "ng" ? "ng" : "us";
  const current = SAMPLES.find((s) => s.t.template === t) ?? SAMPLES[0];
  const audience: Audience = current.audience === "patient" ? { kind: "patient", market } : current.audience === "doctor" ? { kind: "doctor" } : { kind: "public", market };
  const r = renderEmail(current.t, audience, process.env.APP_URL ?? "http://localhost:3000");
  const q = (name: string, mk = market) => `/dev/emails?t=${name}&m=${mk}`;

  return (
    <div className="grid min-h-screen bg-paper lg:grid-cols-[300px_1fr]">
      <nav className="border-b border-line bg-white p-5 lg:border-r lg:border-b-0">
        <div className="font-display text-xl">Email templates</div>
        <p className="mt-1 text-[13px] text-muted">{SAMPLES.length} templates · sample data</p>
        <div className="mt-3 flex gap-2 text-[13px] font-bold">
          {(["us", "ng"] as const).map((mk) => (
            <NextLink key={mk} href={q(current.t.template, mk)} className={mk === market ? "rounded-full bg-forest px-3 py-1 text-white" : "rounded-full border border-line px-3 py-1"}>
              {mk === "us" ? "US patient" : "Nigeria patient"}
            </NextLink>
          ))}
        </div>
        <ul className="mt-4 flex flex-col gap-0.5 text-sm">
          {SAMPLES.map((s) => (
            <li key={s.t.template}>
              <NextLink href={q(s.t.template)} className={s === current ? "block rounded-lg bg-forest/10 px-3 py-1.5 font-bold text-forest" : "block rounded-lg px-3 py-1.5 hover:bg-paper"}>
                {s.t.template}
                <span className="ml-1.5 text-[11px] font-normal text-muted">{s.audience}</span>
              </NextLink>
            </li>
          ))}
        </ul>
      </nav>
      <main className="flex flex-col gap-3 p-5">
        <div className="text-sm">
          <b>Subject:</b> {r.subject}
        </div>
        <iframe title="Email preview" srcDoc={r.html} className="h-[760px] w-full rounded-2xl border border-line bg-white" />
        <details className="text-sm">
          <summary className="cursor-pointer font-bold">Plain-text version</summary>
          <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-white p-4 text-[13px]">{r.text}</pre>
        </details>
      </main>
    </div>
  );
}
