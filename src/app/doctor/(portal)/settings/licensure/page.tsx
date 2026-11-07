import Link from "next/link";
import type { Metadata } from "next";
import { Modal, ModalActions } from "@/components/modal";
import { Button, ButtonLink, Card, PageTitle, StatusTag } from "@/components/ui";
import { requireDoctor } from "@/lib/auth/dal";
import { REGIONS } from "@/lib/booking";
import { db } from "@/lib/db";
import { fmt } from "@/lib/time";
import { saveLicense } from "../../../actions";

export const metadata: Metadata = { title: "Licensure" };

export default async function LicensurePage({ searchParams }: PageProps<"/doctor/settings/licensure">) {
  await requireDoctor();
  const sp = await searchParams;
  const licenses = await db.license.findMany({ orderBy: { status: "asc" } });
  const editing = typeof sp.edit === "string" ? licenses.find((l) => l.id === sp.edit) : null;
  const open = sp.dialog === "add" || editing;
  return (
    <div className="mx-auto max-w-[900px]">
      <PageTitle title="Licensure" subtitle="Where you can see patients. Bookings from other regions are blocked." actions={<ButtonLink href="/doctor/settings/licensure?dialog=add">Add region</ButtonLink>} />
      <Card className="!p-0">
        {licenses.map((l) => (
          <div key={l.id} className="flex flex-wrap items-center gap-4 border-t border-line-soft px-6 py-4 first:border-t-0">
            <div className="min-w-[200px] flex-1">
              <b className="block">{l.regionName}</b>
              <span className="text-[13px] text-muted">
                {l.status === "ACTIVE" ? `${l.credential ?? "License"} ${l.numberMask ?? ""}${l.renewsAt ? ` · Renews ${fmt(l.renewsAt, "UTC", "d MMM yyyy")}` : ""}` : "Not licensed · Patients see an unavailable message"}
              </span>
            </div>
            <StatusTag status={l.status} />
            <Link href={`/doctor/settings/licensure?edit=${l.id}`} className="text-sm font-bold text-forest">
              Edit
            </Link>
          </div>
        ))}
      </Card>
      <p className="mt-4 text-[13px] text-muted">Renewal reminders go to your email 60 days before expiry.</p>
      {open && (
        <Modal closeHref="/doctor/settings/licensure" title={editing ? `Edit ${editing.regionName}` : "Add region"}>
          <form action={saveLicense} className="flex flex-col gap-4">
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="rc" className="label">Region</label>
                <select id="rc" name="regionCode" defaultValue={editing?.regionCode} className="field">
                  {REGIONS.map((r) => (
                    <option key={r.code} value={r.code}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="rn" className="label">Display name</label>
                <input id="rn" name="regionName" defaultValue={editing?.regionName} className="field" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="cr" className="label">Credential</label>
                <input id="cr" name="credential" defaultValue={editing?.credential ?? ""} placeholder="Medical license" className="field" />
              </div>
              <div>
                <label htmlFor="nm" className="label">Number (masked)</label>
                <input id="nm" name="numberMask" defaultValue={editing?.numberMask ?? ""} placeholder="TX-••4821" className="field" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="ra" className="label">Renews</label>
                <input id="ra" name="renewsAt" type="date" defaultValue={editing?.renewsAt?.toISOString().slice(0, 10)} className="field" />
              </div>
              <div>
                <label htmlFor="st" className="label">Status</label>
                <select id="st" name="status" defaultValue={editing?.status ?? "ACTIVE"} className="field">
                  <option value="ACTIVE">Active — patients can book</option>
                  <option value="BLOCKED">Blocked — show unavailable</option>
                </select>
              </div>
            </div>
            <ModalActions>
              <ButtonLink href="/doctor/settings/licensure" variant="secondary">Cancel</ButtonLink>
              <Button>Save region</Button>
            </ModalActions>
          </form>
        </Modal>
      )}
    </div>
  );
}
