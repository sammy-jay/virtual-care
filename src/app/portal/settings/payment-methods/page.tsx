import type { Metadata } from "next";
import { Alert, Button, ButtonLink, Card, PageTitle } from "@/components/ui";
import { requirePatient } from "@/lib/auth/dal";
import { getActiveMembership } from "@/lib/care";
import { db } from "@/lib/db";
import { makeDefaultCard, removeCard } from "../../billing/actions";
import { AddCardForm } from "./add-card";

export const metadata: Metadata = { title: "Payment methods" };

export default async function PaymentMethodsPage({ searchParams }: PageProps<"/portal/settings/payment-methods">) {
  const user = await requirePatient();
  const sp = await searchParams;
  const [cards, m] = await Promise.all([db.paymentMethod.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } }), getActiveMembership(user.id)]);
  return (
    <div className="mx-auto flex max-w-[820px] flex-col gap-4">
      <PageTitle title="Payment methods" subtitle="Used for your plan and extra visits." actions={sp.add ? null : <ButtonLink href="/portal/settings/payment-methods?add=1">Add card</ButtonLink>} />
      {sp.error === "inuse" && <Alert tone="error">That card pays for your plan. Make another card the default first.</Alert>}
      {sp.add && (
        <Card>
          <b>Add a card</b>
          <div className="mt-3">
            <AddCardForm name={user.name} />
          </div>
        </Card>
      )}
      <Card>
        <b>Saved cards</b>
        {cards.length === 0 && <p className="mt-2 text-sm text-body">No saved cards yet.</p>}
        {cards.map((c) => (
          <div key={c.id} className="flex flex-wrap items-center gap-4 border-t border-line-soft py-4 first-of-type:mt-2">
            <span className="flex h-9 w-14 items-center justify-center rounded-lg bg-ink text-[11px] font-extrabold tracking-wider text-white">{c.brand.toUpperCase()}</span>
            <div className="min-w-0 flex-1">
              <b className="block">
                {c.brand} ending {c.last4}
              </b>
              <span className="text-[13px] text-muted">
                Expires {String(c.expMonth).padStart(2, "0")}/{String(c.expYear).slice(-2)}
                {c.isDefault ? ` · Default${m?.paymentMethodId === c.id ? ` · used for ${m.plan.name}` : ""}` : ""}
              </span>
            </div>
            {!c.isDefault && (
              <form action={makeDefaultCard}>
                <input type="hidden" name="id" value={c.id} />
                <Button variant="ghost" size="sm">
                  Make default
                </Button>
              </form>
            )}
            <form action={removeCard}>
              <input type="hidden" name="id" value={c.id} />
              <Button variant="ghost" size="sm" className="!text-danger">
                Remove
              </Button>
            </form>
          </div>
        ))}
      </Card>
      <p className="text-[13px] text-muted">Card details are handled by our payment provider. We never see or store the full number.</p>
    </div>
  );
}
