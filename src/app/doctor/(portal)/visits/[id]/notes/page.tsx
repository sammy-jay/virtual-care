import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VisitTimer } from "@/components/doctor/visit-timer";
import { Alert, Button, ButtonLink, Card, Eyebrow } from "@/components/ui";
import { logAccess } from "@/lib/audit";
import { requireDoctor } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { fmt, PRACTICE_TZ } from "@/lib/time";
import { saveVisitNotes } from "../../../../actions";

export const metadata: Metadata = { title: "Visit notes" };

export default async function VisitNotesPage({ params, searchParams }: PageProps<"/doctor/visits/[id]/notes">) {
  const doc = await requireDoctor();
  const { id } = await params;
  const sp = await searchParams;
  const a = await db.appointment.findUnique({ where: { id }, include: { patient: true, visitType: true, note: true } });
  if (!a) notFound();
  await logAccess(doc, `Opened visit notes · ${a.patient?.name}`, a.patientId);
  const n = a.note;
  const soap: [string, string, string | null | undefined][] = [
    ["subjective", "Subjective", n?.subjective],
    ["objective", "Objective", n?.objective],
    ["assessment", "Assessment", n?.assessment],
    ["plan", "Plan", n?.plan],
  ];
  return (
    <form action={saveVisitNotes} className="mx-auto max-w-[1140px]">
      <input type="hidden" name="id" value={a.id} />
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="h-display text-[34px] md:text-[38px]">Visit notes</h1>
          <p className="mt-1 text-sm text-body">
            {a.patient?.name} · {a.visitType.name} · {fmt(a.startsAt, PRACTICE_TZ, "EEE d MMM")} · Private to you
          </p>
        </div>
        <div className="flex gap-2.5">
          <Button variant="secondary">Save</Button>
          <Button name="then" value="careplan">
            Create care plan
          </Button>
        </div>
      </div>
      {sp.saved === "1" && <Alert tone="success" className="mb-4">Notes saved.</Alert>}
      {n?.quickNotes && (
        <Alert tone="info" className="mb-4">
          <b>Quick notes from the call:</b> {n.quickNotes}
        </Alert>
      )}
      <div className="grid gap-5 lg:grid-cols-[1.7fr_1fr]">
        <div className="grid gap-4 sm:grid-cols-2">
          {soap.map(([name, label, value]) => (
            <Card key={name}>
              <label htmlFor={name} className="eyebrow block">
                {label}
              </label>
              <textarea id={name} name={name} defaultValue={value ?? ""} rows={4} className="field mt-2 resize-y" />
            </Card>
          ))}
        </div>
        <div className="flex flex-col gap-4">
          <Card>
            <Eyebrow>Timer</Eyebrow>
            <div className="mt-2">
              <VisitTimer since={(a.admittedAt ?? a.startsAt).toISOString()} durationMin={a.visitType.durationMin} />
            </div>
          </Card>
          <Card>
            <Eyebrow>Follow-up</Eyebrow>
            <label htmlFor="followUpWeeks" className="label mt-2">
              Next visit
            </label>
            <select id="followUpWeeks" name="followUpWeeks" defaultValue={String(n?.followUpWeeks ?? 4)} className="field">
              {[1, 2, 4, 6, 8, 12].map((w) => (
                <option key={w} value={w}>
                  Book in {w} week{w > 1 ? "s" : ""}
                </option>
              ))}
            </select>
            <ButtonLink href={`/doctor/patients/${a.patientId}`} variant="secondary" size="sm" className="mt-3">
              Book follow-up
            </ButtonLink>
          </Card>
        </div>
      </div>
    </form>
  );
}
