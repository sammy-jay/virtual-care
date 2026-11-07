import Link from "next/link";
import type { Metadata } from "next";
import { Icon, type IconName } from "@/components/icons";
import { Modal, ModalActions } from "@/components/modal";
import { Alert, Button, ButtonLink, Card, PageTitle } from "@/components/ui";
import { requireDoctor } from "@/lib/auth/dal";
import { getPractice } from "@/lib/care";
import { db } from "@/lib/db";
import { moneyShort } from "@/lib/format";
import { memberRateCents } from "@/lib/pricing";
import { savePlan, saveVisitType } from "../../actions";

export const metadata: Metadata = { title: "Settings" };

export default async function DoctorSettingsPage({ searchParams }: PageProps<"/doctor/settings">) {
  await requireDoctor();
  const sp = await searchParams;
  const [types, plans, licenses, templates, openReqs, practice] = await Promise.all([
    db.visitType.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    db.plan.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    db.license.findMany(),
    db.messageTemplate.count(),
    db.dataRequest.count({ where: { status: "OPEN" } }),
    getPractice(),
  ]);
  const refPlan = plans.find((p) => p.popular) ?? plans[0];
  const dialog = typeof sp.dialog === "string" ? sp.dialog : null;
  const editType = dialog?.startsWith("type-") ? types.find((t) => `type-${t.id}` === dialog) : null;
  const editPlan = dialog?.startsWith("plan-") ? plans.find((p) => `plan-${p.id}` === dialog) : null;
  const licLine = licenses.filter((l) => l.status === "ACTIVE").map((l) => `${l.regionName.split(",")[0]} active`).join(" · ");
  const links: [string, IconName, string, string][] = [
    ["/doctor/settings/licensure", "shield", "Licensure", licLine || "No regions yet"],
    ["/doctor/messages/templates", "chat", "Message templates", `${templates} saved replies`],
    ["/doctor/earnings", "card", "Payouts", practice.payoutLast4 ? `${practice.payoutSchedule} to ${practice.payoutBank} ••${practice.payoutLast4}` : "Not connected"],
    ["/doctor/settings/access-log", "lock", "Access log", "Every view of patient data"],
    ["/doctor/settings/data-requests", "download", "Data requests", `${openReqs} open`],
    ["/doctor/setup", "check", "Practice setup", practice.bookingPublished ? "Booking page is live" : "Finish setup to go live"],
  ];

  return (
    <div className="mx-auto max-w-[1140px]">
      <PageTitle title="Settings" subtitle="Practice, pricing and compliance" />
      {sp.saved === "1" && <Alert tone="success" className="mb-4">Saved. New prices apply to new bookings.</Alert>}
      <Card className="mb-5 overflow-x-auto !p-0">
        <div className="flex items-center justify-between px-6 pt-5">
          <b className="font-display text-[22px] font-normal">Visit types</b>
          <ButtonLink href="/doctor/settings?dialog=type-new" size="sm" variant="secondary">
            New visit type
          </ButtonLink>
        </div>
        <table className="mt-2 w-full min-w-[560px] text-left text-[14.5px]">
          <thead>
            <tr className="text-[11.5px] font-extrabold uppercase tracking-[.12em] text-muted">
              <th className="px-6 py-2">Visit type</th>
              <th className="px-3">Length</th>
              <th className="px-3">Price</th>
              <th className="px-3">Member rate</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {types.map((t) => (
              <tr key={t.id} className="border-t border-line-soft">
                <td className="px-6 py-3 font-bold">{t.name}</td>
                <td className="px-3">{t.durationMin} min</td>
                <td className="px-3">{t.alwaysFree ? "Free" : moneyShort(t.priceCents)}</td>
                <td className="px-3">{t.alwaysFree ? "Free" : refPlan ? moneyShort(memberRateCents(t, refPlan)) : "—"}</td>
                <td className="px-6 text-right">
                  <Link href={`/doctor/settings?dialog=type-${t.id}`} className="text-sm font-bold text-forest">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card className="mb-5 overflow-x-auto !p-0">
        <div className="flex items-center justify-between px-6 pt-5">
          <b className="font-display text-[22px] font-normal">Membership plans</b>
          <ButtonLink href="/doctor/settings?dialog=plan-new" size="sm" variant="secondary">
            New plan
          </ButtonLink>
        </div>
        <table className="mt-2 w-full min-w-[560px] text-left text-[14.5px]">
          <thead>
            <tr className="text-[11.5px] font-extrabold uppercase tracking-[.12em] text-muted">
              <th className="px-6 py-2">Plan</th>
              <th className="px-3">Monthly</th>
              <th className="px-3">Included</th>
              <th className="px-3">Discount</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {plans.map((p) => (
              <tr key={p.id} className="border-t border-line-soft">
                <td className="px-6 py-3 font-bold">{p.name}</td>
                <td className="px-3">{moneyShort(p.monthlyPriceCents)}</td>
                <td className="px-3">{p.includedLabel ?? p.includedVisits}</td>
                <td className="px-3">{p.discountPct}%</td>
                <td className="px-6 text-right">
                  <Link href={`/doctor/settings?dialog=plan-${p.id}`} className="text-sm font-bold text-forest">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {links.map(([href, icon, t, b]) => (
          <Link key={href} href={href} className="card flex items-center gap-3 hover:border-forest">
            <span className="flex size-11 flex-none items-center justify-center rounded-xl bg-sage text-forest">
              <Icon name={icon} size={19} />
            </span>
            <span className="min-w-0 flex-1">
              <b className="block">{t}</b>
              <span className="text-[13px] text-muted">{b}</span>
            </span>
          </Link>
        ))}
      </div>

      {(dialog === "type-new" || editType) && (
        <Modal closeHref="/doctor/settings" title={editType ? "Edit visit type" : "New visit type"} subtitle={editType?.name ?? "Set length and price."}>
          {sp.error && <Alert tone="error" className="mb-3">Add a name, a length of 10 minutes or more, and a price.</Alert>}
          <form action={saveVisitType} className="flex flex-col gap-4">
            {editType && <input type="hidden" name="id" value={editType.id} />}
            <div>
              <label htmlFor="vt-name" className="label">Name</label>
              <input id="vt-name" name="name" defaultValue={editType?.name} className="field" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label htmlFor="vt-len" className="label">Length (min)</label>
                <input id="vt-len" name="durationMin" type="number" min={10} step={5} defaultValue={editType?.durationMin ?? 30} className="field" />
              </div>
              <div>
                <label htmlFor="vt-price" className="label">Standard price</label>
                <input id="vt-price" name="price" inputMode="decimal" defaultValue={editType ? (editType.priceCents / 100).toString() : ""} placeholder="$" className="field" />
              </div>
              <div>
                <label htmlFor="vt-member" className="label">Member rate</label>
                <input id="vt-member" name="memberPrice" inputMode="decimal" defaultValue={editType?.memberPriceCents != null ? (editType.memberPriceCents / 100).toString() : ""} placeholder={editType && refPlan ? `${(memberRateCents(editType, refPlan) / 100).toFixed(2)} (${refPlan.discountPct}% off)` : "Plan discount"} className="field" />
              </div>
            </div>
            <p className="-mt-2 text-[13px] text-muted">Members pay this when their plan does not include the visit. Leave blank to use each plan’s discount.</p>
            <div>
              <label htmlFor="vt-desc" className="label">Description</label>
              <input id="vt-desc" name="description" defaultValue={editType?.description ?? ""} className="field" />
            </div>
            <ModalActions>
              <ButtonLink href="/doctor/settings" variant="secondary">Cancel</ButtonLink>
              <Button>{editType ? "Save changes" : "Create visit type"}</Button>
            </ModalActions>
          </form>
        </Modal>
      )}

      {(dialog === "plan-new" || editPlan) && (
        <Modal closeHref="/doctor/settings" title={editPlan ? "Edit plan" : "New plan"} subtitle={editPlan?.name ?? "Name it, price it, choose what it includes."}>
          {sp.error && <Alert tone="error" className="mb-3">Add a name, a monthly price and a discount between 0 and 100%.</Alert>}
          <form action={savePlan} className="flex flex-col gap-4">
            {editPlan && <input type="hidden" name="id" value={editPlan.id} />}
            <div>
              <label htmlFor="pl-name" className="label">Plan name</label>
              <input id="pl-name" name="name" defaultValue={editPlan?.name} className="field" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label htmlFor="pl-price" className="label">Monthly price ($)</label>
                <input id="pl-price" name="price" inputMode="decimal" defaultValue={editPlan ? String(editPlan.monthlyPriceCents / 100) : ""} className="field" />
              </div>
              <div>
                <label htmlFor="pl-ngn" className="label">Naira price (₦)</label>
                <input id="pl-ngn" name="priceNgn" inputMode="numeric" defaultValue={editPlan?.monthlyPriceNgn} className="field" />
              </div>
              <div>
                <label htmlFor="pl-disc" className="label">Member discount (%)</label>
                <input id="pl-disc" name="discountPct" type="number" min={0} max={100} defaultValue={editPlan?.discountPct ?? 15} className="field" />
              </div>
            </div>
            <div className="grid grid-cols-[120px_1fr] gap-3">
              <div>
                <label htmlFor="pl-inc" className="label">Included / mo</label>
                <input id="pl-inc" name="includedVisits" type="number" min={0} defaultValue={editPlan?.includedVisits ?? 0} className="field" />
              </div>
              <div>
                <label htmlFor="pl-label" className="label">Shown as</label>
                <input id="pl-label" name="includedLabel" defaultValue={editPlan?.includedLabel ?? ""} placeholder="e.g. 1 follow-up" className="field" />
              </div>
            </div>
            <fieldset>
              <legend className="label">Visit types that count as included</legend>
              <div className="flex flex-wrap gap-2">
                {types
                  .filter((t) => !t.alwaysFree)
                  .map((t) => (
                    <label key={t.id} className="flex cursor-pointer items-center gap-2 rounded-full border-[1.5px] border-line px-3 py-2 text-sm has-[:checked]:border-forest has-[:checked]:bg-sage">
                      <input type="checkbox" name="includedVisitTypeIds" value={t.id} defaultChecked={editPlan?.includedVisitTypeIds.includes(t.id)} className="accent-forest" />
                      {t.name}
                    </label>
                  ))}
              </div>
            </fieldset>
            <p className="text-[13px] text-muted">Included visits are never charged. The allowance resets every billing date.</p>
            <ModalActions>
              <ButtonLink href="/doctor/settings" variant="secondary">Cancel</ButtonLink>
              <Button>{editPlan ? "Save changes" : "Create plan"}</Button>
            </ModalActions>
          </form>
        </Modal>
      )}
    </div>
  );
}
