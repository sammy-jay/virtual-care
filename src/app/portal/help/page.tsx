import Link from "next/link";
import type { Metadata } from "next";
import { Card, IconTile, PageTitle } from "@/components/ui";
import { requirePatient } from "@/lib/auth/dal";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Help and support" };

export default async function HelpPage() {
  const user = await requirePatient();
  const next = await db.appointment.findFirst({ where: { patientId: user.id, status: "SCHEDULED", startsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" } });
  const cards = [
    ["video", "sky", "Joining a video visit", "Test your camera and mic before the visit.", next ? `/portal/visits/${next.id}/precheck` : "/portal/visits", "Run a check"],
    ["card", "gold", "Billing questions", "Receipts, refunds and plan changes.", "/portal/billing", "View billing"],
    ["chat", "sage", "Contact the care team", "We reply within 1 business day.", "/portal/messages", "Send message"],
  ] as const;
  const qa = [
    ["Why was I charged for a visit?", "Included visits are never charged. Extra visits use your member rate, and the payment page tells you why."],
    ["Can I cancel a visit?", "Yes, up to 12 hours before. Included visits return to your allowance."],
    ["What if my video fails?", "Rejoin from My visits, or use the backup link we email you."],
    ["Is this for emergencies?", "No. In an emergency call your local emergency number."],
  ];
  return (
    <div className="mx-auto max-w-[1000px]">
      <PageTitle title="Help and support" subtitle="Answers for the most common questions." />
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map(([icon, tone, t, b, href, cta]) => (
          <Card key={t}>
            <IconTile icon={icon} tone={tone} size={48} />
            <b className="mt-3 block text-[16px]">{t}</b>
            <p className="text-sm text-body">{b}</p>
            <Link href={href} className="mt-3 inline-block text-sm font-bold text-forest">
              {cta} →
            </Link>
          </Card>
        ))}
      </div>
      <Card className="mt-5">
        <b className="text-[16px]">Common questions</b>
        {qa.map(([q, a]) => (
          <details key={q} className="group border-t border-line-soft py-4 first-of-type:mt-2">
            <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
              {q}
              <span className="text-forest transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="mt-2 text-[15px] text-body">{a}</p>
          </details>
        ))}
      </Card>
    </div>
  );
}
