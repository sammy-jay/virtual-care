import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ButtonLink, Card, IconTile } from "@/components/ui";
import { requirePatient } from "@/lib/auth/dal";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Visit ended" };

export default async function VisitEndedPage({ params }: PageProps<"/portal/visits/[id]/ended">) {
  const user = await requirePatient();
  const { id } = await params;
  const a = await db.appointment.findUnique({ where: { id }, include: { visitType: true } });
  if (!a || a.patientId !== user.id) notFound();
  const intro = a.visitType.alwaysFree;
  return (
    <Card className="mx-auto max-w-[620px] text-center">
      <div className="flex justify-center">
        <IconTile icon="check" tone="sage" size={64} />
      </div>
      <h1 className="h-display mt-4 text-[34px]">You have left the visit</h1>
      <p className="mt-2 text-[15.5px] text-body">
        {intro ? "Thank you for meeting Dr. Oparaji. Here is how to keep going." : "Dr. Oparaji will publish your care plan after the visit. You will get an email with no clinical content."}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {intro ? <ButtonLink href="/portal/next-steps">See next steps</ButtonLink> : <ButtonLink href={`/portal/visits/${a.id}/feedback`}>Rate your visit</ButtonLink>}
        <ButtonLink href="/portal/messages" variant="secondary">
          Message Dr. Oparaji
        </ButtonLink>
      </div>
      {a.status === "SCHEDULED" && !a.endedAt && (
        <ButtonLink href={`/room/${a.id}`} variant="ghost" className="mt-3">
          Rejoin the visit
        </ButtonLink>
      )}
    </Card>
  );
}
