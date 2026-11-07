import type { Metadata } from "next";
import { Modal, ModalActions } from "@/components/modal";
import { Alert, Button, ButtonLink, Card, Eyebrow, PageTitle, Row } from "@/components/ui";
import { requirePatient } from "@/lib/auth/dal";
import { getActiveMembership } from "@/lib/care";
import { db } from "@/lib/db";
import { fmtShort, relativeLabel } from "@/lib/time";
import { deleteAccount, requestExport } from "../actions";

export const metadata: Metadata = { title: "Data and privacy" };

export default async function PrivacySettingsPage({ searchParams }: PageProps<"/portal/settings/privacy">) {
  const user = await requirePatient();
  const sp = await searchParams;
  const tz = user.timeZone;
  const [logs, openReq, m, upcoming] = await Promise.all([
    db.accessLog.findMany({ where: { patientId: user.id, NOT: { actorId: user.id } }, orderBy: { createdAt: "desc" }, take: 8 }),
    db.dataRequest.findFirst({ where: { patientId: user.id, kind: "EXPORT", status: "OPEN" } }),
    getActiveMembership(user.id),
    db.appointment.findMany({ where: { patientId: user.id, status: "SCHEDULED", startsAt: { gte: new Date() } } }),
  ]);
  return (
    <div className="mx-auto flex max-w-[820px] flex-col gap-4">
      <PageTitle title="Data and privacy" subtitle="Your records belong to you." />
      {sp.requested === "1" && <Alert tone="success">Export requested. We will email you when it is ready, within 30 days.</Alert>}
      <Card>
        <Eyebrow>Download your data</Eyebrow>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
          <p className="max-w-[480px] text-[15px] text-body">A ZIP with your visits, care plans, messages and receipts. Ready within 30 days, usually in minutes.</p>
          {openReq ? (
            <span className="text-sm font-bold text-gold-ink">Requested {fmtShort(openReq.createdAt, tz)} · due {fmtShort(openReq.dueAt, tz)}</span>
          ) : (
            <form action={requestExport}>
              <Button variant="secondary">Request export</Button>
            </form>
          )}
        </div>
      </Card>
      <Card>
        <Eyebrow>Who saw your record</Eyebrow>
        <div className="mt-2">
          {logs.length === 0 && <p className="py-2 text-sm text-body">No one else has opened your record yet.</p>}
          {logs.map((l) => (
            <Row key={l.id} label={l.actorLabel}>
              {relativeLabel(l.createdAt, tz)}
            </Row>
          ))}
        </div>
        <p className="mt-2 text-[13px] text-muted">Every view is logged and kept for 7 years.</p>
      </Card>
      <Card className="!border-coral-tint">
        <Eyebrow className="!text-danger">Delete account</Eyebrow>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
          <p className="max-w-[480px] text-[15px] text-body">Removes your profile and messages. Medical records are kept for the legal period, then erased.</p>
          <ButtonLink href="/portal/settings/privacy?dialog=delete" variant="danger">
            Delete my account
          </ButtonLink>
        </div>
      </Card>

      {sp.dialog === "delete" && (
        <Modal closeHref="/portal/settings/privacy" title="Delete your account?" subtitle="This cannot be undone." icon="trash" iconTone="coral">
          <p className="text-[15px] text-body">
            {m ? `Your ${m.plan.name} plan will be cancelled. ` : ""}
            {upcoming.length ? `Your ${upcoming.map((u) => fmtShort(u.startsAt, tz)).join(", ")} visit${upcoming.length > 1 ? "s" : ""} will be cancelled and refunded in full.` : ""}
          </p>
          <form action={deleteAccount} className="mt-4">
            <label htmlFor="confirm" className="label">
              Type DELETE to confirm
            </label>
            <input id="confirm" name="confirm" autoComplete="off" className="field" aria-invalid={sp.error ? true : undefined} />
            {sp.error && <p className="mt-1.5 text-[13px] font-semibold text-danger">Type DELETE in capitals.</p>}
            <ModalActions>
              <ButtonLink href="/portal/settings/privacy" variant="secondary">
                Keep my account
              </ButtonLink>
              <Button variant="danger">Delete account</Button>
            </ModalActions>
          </form>
        </Modal>
      )}
    </div>
  );
}
