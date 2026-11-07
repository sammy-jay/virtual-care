import Link from "next/link";
import type { Metadata } from "next";
import { Icon } from "@/components/icons";
import { Alert, Button, Card, Eyebrow, PageTitle, Toggle } from "@/components/ui";
import { requirePatient } from "@/lib/auth/dal";
import { TIME_ZONES } from "@/lib/time";
import { signOut } from "../../(auth)/actions";
import { saveSettings } from "./actions";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage({ searchParams }: PageProps<"/portal/settings">) {
  const user = await requirePatient();
  const { saved } = await searchParams;
  const n = user.notifyPrefs ?? { visitReminders: true, newMessages: true, carePlans: true, productNews: false };
  return (
    <div className="mx-auto flex max-w-[820px] flex-col gap-4">
      <PageTitle title="Settings" />
      {saved === "1" && <Alert tone="success">Settings saved.</Alert>}
      <form action={saveSettings} className="flex flex-col gap-4">
        <Card>
          <Eyebrow>Account</Eyebrow>
          <div className="mt-3 grid gap-3.5 sm:grid-cols-2">
            <div>
              <div className="label">Email</div>
              <div className="field flex items-center bg-canvas">{user.email}</div>
            </div>
            <div>
              <label htmlFor="timeZone" className="label">
                Time zone
              </label>
              <select id="timeZone" name="timeZone" defaultValue={user.timeZone} className="field">
                {TIME_ZONES.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>
        <Card>
          <Eyebrow>Notifications</Eyebrow>
          <div className="mt-1">
            <Toggle name="visitReminders" defaultChecked={n.visitReminders} label="Visit reminders" description="Email and SMS, 24 hours and 1 hour before" />
            <Toggle name="newMessages" defaultChecked={n.newMessages} label="New messages" description="Email when Dr. Oparaji replies" />
            <Toggle name="carePlans" defaultChecked={n.carePlans} label="Care plan published" description="Email when a plan is ready" />
            <Toggle name="productNews" defaultChecked={n.productNews} label="Product news" description="Occasional updates" />
          </div>
          <div className="mt-3 flex justify-end">
            <Button>Save settings</Button>
          </div>
        </Card>
      </form>
      <Card>
        <Eyebrow>More</Eyebrow>
        {[
          ["/portal/settings/security", "Security and password"],
          ["/portal/settings/privacy", "Data and privacy"],
          ["/portal/settings/payment-methods", "Payment methods"],
          ["/portal/notifications", "Notification history"],
          ["/portal/billing", "Billing and receipts"],
          ["/portal/help", "Help and support"],
        ].map(([href, label]) => (
          <Link key={href} href={href} className="flex items-center justify-between border-t border-line-soft py-3.5 first-of-type:mt-1">
            <b>{label}</b>
            <Icon name="arrow" size={16} />
          </Link>
        ))}
      </Card>
      <form action={signOut} className="lg:hidden">
        <Button variant="secondary" className="w-full">
          Sign out
        </Button>
      </form>
    </div>
  );
}
