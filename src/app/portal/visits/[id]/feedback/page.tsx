import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StarRating } from "@/components/star-rating";
import { Button, ButtonLink, Card } from "@/components/ui";
import { requirePatient } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { sendFeedback } from "../video-actions";

export const metadata: Metadata = { title: "Visit feedback" };

export default async function FeedbackPage({ params }: PageProps<"/portal/visits/[id]/feedback">) {
  const user = await requirePatient();
  const { id } = await params;
  const a = await db.appointment.findUnique({ where: { id }, include: { visitType: true, feedback: true } });
  if (!a || a.patientId !== user.id) notFound();
  return (
    <Card className="mx-auto max-w-[620px]">
      <h1 className="h-display text-[34px]">How was your visit?</h1>
      <p className="mt-1 text-body">{a.visitType.name} with Dr. Oparaji</p>
      <form action={sendFeedback} className="mt-5">
        <input type="hidden" name="id" value={a.id} />
        <StarRating initial={a.feedback?.rating ?? 5} />
        <label htmlFor="comment" className="label mt-5">
          Anything we should know? (optional)
        </label>
        <textarea id="comment" name="comment" rows={4} defaultValue={a.feedback?.comment ?? ""} placeholder="Share what went well or what could be better" className="field resize-none" />
        <div className="mt-5 flex flex-wrap gap-3">
          <Button>Send feedback</Button>
          <ButtonLink href="/portal" variant="ghost">
            Skip
          </ButtonLink>
        </div>
        <p className="mt-4 text-[13px] text-muted">Feedback goes to the practice, not to other patients.</p>
      </form>
    </Card>
  );
}
