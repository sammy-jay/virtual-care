import type { Metadata } from "next";
import { Modal, ModalActions } from "@/components/modal";
import { Alert, Avatar, Button, ButtonLink, Card, EmptyState, PageTitle, Row, StatusTag } from "@/components/ui";
import { requireDoctor } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { initials } from "@/lib/format";
import { fmtShort, PRACTICE_TZ } from "@/lib/time";
import { completeDataRequest, declineDataRequest } from "../../../actions";

export const metadata: Metadata = { title: "Data requests" };

export default async function DataRequestsPage({ searchParams }: PageProps<"/doctor/settings/data-requests">) {
  await requireDoctor();
  const sp = await searchParams;
  const reqs = await db.dataRequest.findMany({ orderBy: [{ status: "desc" }, { dueAt: "asc" }], include: { patient: true }, take: 50 });
  return (
    <div className="mx-auto max-w-[900px]">
      <PageTitle title="Data requests" subtitle="Patient export and deletion requests" />
      {sp.done === "1" && <Alert tone="success" className="mb-4">Export prepared. The patient was notified.</Alert>}
      {reqs.length === 0 && <EmptyState icon="download" title="No requests" body="Patient export and deletion requests appear here." />}
      <div className="flex flex-col gap-4">
        {reqs.map((r) => (
          <Card key={r.id}>
            <div className="flex flex-wrap items-center gap-3">
              <Avatar initials={initials(r.patient.name)} tone="sage" />
              <div className="min-w-0 flex-1">
                <b className="block">
                  {r.patient.deletedAt ? "Deleted patient" : r.patient.name} · {r.kind === "EXPORT" ? "Export my data" : "Delete my account"}
                </b>
                <span className="text-[13px] text-muted">
                  Requested {fmtShort(r.createdAt, PRACTICE_TZ)} · due {fmtShort(r.dueAt, PRACTICE_TZ)}
                </span>
              </div>
              <StatusTag status={r.status} />
            </div>
            {r.status === "OPEN" && (
              <>
                <div className="mt-3">
                  <Row label="Scope">{r.scope}</Row>
                  <Row label="Format">{r.format}</Row>
                  <Row label="Identity check">{r.identityVerified ? "Verified by email" : "Not verified"}</Row>
                </div>
                <div className="mt-4 flex flex-wrap gap-2.5">
                  <form action={completeDataRequest}>
                    <input type="hidden" name="id" value={r.id} />
                    <Button>Prepare export</Button>
                  </form>
                  <ButtonLink href={`/doctor/settings/data-requests?dialog=decline&id=${r.id}`} variant="secondary">
                    Decline with reason
                  </ButtonLink>
                </div>
              </>
            )}
            {r.declineReason && <p className="mt-3 text-sm text-body">Declined: {r.declineReason}</p>}
          </Card>
        ))}
      </div>
      <p className="mt-4 text-[13px] text-muted">Requests must be answered within 30 days.</p>
      {sp.dialog === "decline" && typeof sp.id === "string" && (
        <Modal closeHref="/doctor/settings/data-requests" title="Decline request" subtitle="The reason is sent to the patient.">
          <form action={declineDataRequest}>
            <input type="hidden" name="id" value={sp.id} />
            <label htmlFor="reason" className="label">Reason</label>
            <textarea id="reason" name="reason" rows={3} className="field resize-none" aria-invalid={sp.error ? true : undefined} />
            {sp.error && <p className="mt-1 text-[13px] font-semibold text-danger">Add a reason.</p>}
            <ModalActions>
              <ButtonLink href="/doctor/settings/data-requests" variant="secondary">Cancel</ButtonLink>
              <Button variant="danger">Decline</Button>
            </ModalActions>
          </form>
        </Modal>
      )}
    </div>
  );
}
