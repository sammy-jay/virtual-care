import Link from "@/components/market";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icons";
import { Modal, ModalActions } from "@/components/modal";
import { Alert, Button, ButtonLink, Card, Eyebrow, StatusTag } from "@/components/ui";
import { logAccess } from "@/lib/audit";
import { requireDoctor } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { firstName } from "@/lib/format";
import { fmtShort, PRACTICE_TZ } from "@/lib/time";
import { publishCarePlan, saveCarePlan } from "../../../actions";

export const metadata: Metadata = { title: "Care plan" };

export default async function CarePlanEditorPage({ params, searchParams }: PageProps<"/doctor/care-plans/[id]">) {
  const doc = await requireDoctor();
  const { id } = await params;
  const sp = await searchParams;
  const plan = await db.carePlan.findUnique({ where: { id }, include: { patient: true, appointment: { include: { visitType: true } } } });
  if (!plan) notFound();
  await logAccess(doc, `Opened care plan · ${plan.patient.name}`, plan.patientId);
  const complete = !!plan.summary && plan.goals.length > 0 && plan.nutrition.length > 0 && plan.nextSteps.length > 0;
  const fields: [string, string, string, string][] = [
    ["summary", "Summary", plan.summary, "How is the patient doing? What will you focus on next?"],
    ["goals", "Goals", plan.goals.join("\n"), "One per line"],
    ["nutrition", "Nutrition", plan.nutrition.join("\n"), "One per line"],
    ["movement", "Movement and rest", plan.movement.join("\n"), "One per line"],
    ["nextSteps", "Next steps", plan.nextSteps.join("\n"), "One per line"],
  ];
  return (
    <div className="mx-auto max-w-[1140px]">
      <form action={saveCarePlan}>
        <input type="hidden" name="id" value={plan.id} />
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="h-display text-[34px] md:text-[38px]">Care plan</h1>
            <p className="mt-1 text-sm text-body">
              <Link href={`/doctor/patients/${plan.patientId}`} className="underline">
                {plan.patient.name}
              </Link>{" "}
              · {plan.appointment.visitType.name} · {fmtShort(plan.appointment.startsAt, PRACTICE_TZ)} · <StatusTag status={plan.status} />
            </p>
          </div>
          <div className="flex gap-2.5">
            <Button variant="secondary">Save draft</Button>
            <Button name="then" value="publish">
              {plan.status === "PUBLISHED" ? "Republish" : "Publish to patient"}
            </Button>
          </div>
        </div>
        {sp.saved === "1" && <Alert tone="success" className="mb-4">Draft saved.</Alert>}
        <div className="grid gap-5 lg:grid-cols-[1.7fr_1fr]">
          <div className="flex flex-col gap-4">
            {fields.map(([name, label, value, hint]) => (
              <Card key={name}>
                <label htmlFor={name} className="eyebrow block">
                  {label}
                </label>
                <textarea id={name} name={name} defaultValue={value} rows={name === "summary" ? 4 : 3} placeholder={hint} className="field mt-2 resize-y" />
              </Card>
            ))}
          </div>
          <div className="flex flex-col gap-4">
            <Card className="!bg-sky-tint !border-sky-tint">
              <Eyebrow className="!text-sky">Visibility</Eyebrow>
              <p className="mt-1.5 text-sm text-sky-ink">Patient sees this plan only after you publish. They are notified by email.</p>
            </Card>
            <Card>
              <Eyebrow>Visit notes</Eyebrow>
              <p className="mt-1.5 text-sm text-body">Private notes stay with you.</p>
              <ButtonLink href={`/doctor/visits/${plan.appointmentId}/notes`} variant="secondary" size="sm" className="mt-3">
                Open visit notes
              </ButtonLink>
            </Card>
          </div>
        </div>
      </form>

      {sp.dialog === "publish" && (
        <Modal closeHref={`/doctor/care-plans/${plan.id}`} title="Publish this care plan?" subtitle={`${plan.patient.name} will see it in ${firstName(plan.patient.name)}’s portal and get an email.`} icon="doc">
          <ul className="flex flex-col gap-2.5 text-[15px]">
            {[
              [complete, complete ? "Summary, goals, nutrition and next steps are complete" : "Some sections are empty — the patient will see only what is filled in"],
              [true, "Private visit notes stay hidden"],
              [true, "You can edit and republish any time"],
            ].map(([ok, t]) => (
              <li key={String(t)} className="flex gap-2.5">
                <Icon name={ok ? "check" : "alert"} size={18} strokeWidth={2.4} className={ok ? "mt-0.5 text-forest" : "mt-0.5 text-gold-ink"} />
                {t}
              </li>
            ))}
          </ul>
          <form action={publishCarePlan}>
            <input type="hidden" name="id" value={plan.id} />
            <ModalActions>
              <ButtonLink href={`/doctor/care-plans/${plan.id}`} variant="secondary">
                Keep editing
              </ButtonLink>
              <Button>Publish now</Button>
            </ModalActions>
          </form>
        </Modal>
      )}
    </div>
  );
}
