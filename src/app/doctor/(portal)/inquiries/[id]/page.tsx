import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Alert, Button, ButtonLink, Card, Eyebrow, StatusTag } from "@/components/ui";
import { requireDoctor } from "@/lib/auth/dal";
import { getPlans, getPractice, getVisitTypes } from "@/lib/care";
import { db } from "@/lib/db";
import { money, moneyShort } from "@/lib/format";
import { memberRateCents, usdToNgnKobo } from "@/lib/pricing";
import { fmt, listDateLabel, PRACTICE_TZ } from "@/lib/time";
import { closeInquiry, replyInquiry } from "../../../actions";
import { TemplatePicker } from "./template-picker";

export const metadata: Metadata = { title: "Inquiry" };

/** Simple keyword matcher for the "Suggested answer" card, using live prices. */
async function suggest(text: string) {
  const [types, plans, { ngnPerUsd }] = await Promise.all([getVisitTypes(), getPlans(), getPractice()]);
  const t = text.toLowerCase();
  const thrive = plans.find((p) => p.popular) ?? plans[0];
  const coaching = types.find((v) => v.slug === "family-coaching");
  const covers = plans.filter((p) => coaching && p.includedVisitTypeIds.includes(coaching.id));
  if (/coach|family|husband|wife|together/.test(t) && coaching && thrive)
    return `Family coaching is a ${coaching.durationMin}-minute visit at ${moneyShort(coaching.priceCents)} (${moneyShort(usdToNgnKobo(coaching.priceCents, ngnPerUsd), "NGN")} in Nigeria), or ${moneyShort(memberRateCents(coaching, thrive))} (${moneyShort(usdToNgnKobo(memberRateCents(coaching, thrive), ngnPerUsd), "NGN")}) for ${thrive.name} members.${covers.length ? ` ${covers.map((p) => p.name).join(", ")} members get coaching included.` : ""}`;
  if (/abuja|lagos|nigeria|texas|houston|licen|where/.test(t)) {
    const lic = await db.license.findMany({ where: { status: "ACTIVE" } });
    return `Dr. Oparaji sees patients located in ${lic.map((l) => l.regionName).join(" and ")}. Patients confirm their location when they book.`;
  }
  if (/member|plan|pause|cancel/.test(t)) {
    const end = "access continues to the end of the billing period.";
    if (plans.length === 1) {
      const p = plans[0];
      return `Membership is ${moneyShort(p.monthlyPriceCents)}/mo, or ${moneyShort(p.monthlyPriceNgn * 100, "NGN")}/mo for patients in Nigeria${p.includedVisits ? `, with ${p.includedLabel ?? "a visit"} included each month` : ""}, secure messaging and ${p.discountPct}% off other visits. You can cancel any time from your account; ${end}`;
    }
    return `Plans start at ${money(plans[0]?.monthlyPriceCents ?? 0)}/mo. You can switch or cancel any time from your account; ${end}`;
  }
  if (/insur|receipt/.test(t)) return "Every payment has a downloadable receipt with the visit type and date, which most insurers accept for reimbursement.";
  return null;
}

export default async function InquiryDetailPage({ params, searchParams }: PageProps<"/doctor/inquiries/[id]">) {
  await requireDoctor();
  const { id } = await params;
  const sp = await searchParams;
  const q = await db.inquiry.findUnique({ where: { id } });
  if (!q) notFound();
  const [templates, suggestion] = await Promise.all([db.messageTemplate.findMany({ orderBy: { sortOrder: "asc" } }), suggest(`${q.topic} ${q.body}`)]);
  const when = listDateLabel(q.createdAt, PRACTICE_TZ);
  return (
    <div className="mx-auto max-w-[1100px]">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="h-display text-[32px] md:text-[36px]">{q.topic}</h1>
          <p className="mt-1 text-sm text-body">
            From {q.name} · {q.email} · {when.includes(":") ? `Today ${when}` : `${when} ${fmt(q.createdAt, PRACTICE_TZ, "h:mm a")}`}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <StatusTag status={q.status} />
          {q.status !== "CLOSED" && (
            <form action={closeInquiry}>
              <input type="hidden" name="id" value={q.id} />
              <Button variant="secondary" size="sm">
                Mark closed
              </Button>
            </form>
          )}
          <ButtonLink href="/doctor/appointments" size="sm">
            Book intro call
          </ButtonLink>
        </div>
      </div>
      {sp.sent === "1" && <Alert tone="success" className="mb-4">Reply sent by email.</Alert>}
      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col gap-5">
          <Card>
            <p className="whitespace-pre-wrap text-[15.5px]">{q.body}</p>
          </Card>
          {q.replies.map((r, i) => (
            <Card key={i} className="!bg-sage">
              <Eyebrow>Your reply · {fmt(r.sentAt, PRACTICE_TZ, "EEE d MMM h:mm a")}</Eyebrow>
              <p className="mt-2 whitespace-pre-wrap text-[15px]">{r.body}</p>
            </Card>
          ))}
          <Card>
            <b>Reply</b>
            <TemplatePicker templates={templates} suggestion={suggestion}>
              <form action={replyInquiry} className="mt-3 flex flex-col gap-3" id="reply-form">
                <input type="hidden" name="id" value={q.id} />
                <label htmlFor="reply" className="sr-only">Reply</label>
                <textarea id="reply" name="body" rows={6} placeholder="Write your reply…" className="field resize-y" aria-invalid={sp.error ? true : undefined} />
                {sp.error && <p className="text-[13px] font-semibold text-danger">Write a reply first.</p>}
                <div>
                  <Button>Send reply</Button>
                </div>
              </form>
            </TemplatePicker>
          </Card>
        </div>
        {suggestion && (
          <Card className="h-fit !bg-gold-tint !border-gold-line">
            <Eyebrow className="!text-gold-ink">Suggested answer</Eyebrow>
            <p className="mt-2 text-[15px]">{suggestion}</p>
          </Card>
        )}
      </div>
    </div>
  );
}
