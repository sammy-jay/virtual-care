import Link from "next/link";
import type { Metadata } from "next";
import type { NotificationCategory } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { NotificationList } from "@/components/notification-list";
import { Button, Card, PageTitle } from "@/components/ui";
import { requirePatient } from "@/lib/auth/dal";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Notifications" };

const TABS: Record<string, NotificationCategory[]> = { visits: ["VISITS"], messages: ["MESSAGES", "CARE_PLANS"], billing: ["BILLING"] };

async function markAllRead() {
  "use server";
  const user = await requirePatient();
  await db.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/portal", "layout");
}

export default async function PatientNotificationsPage({ searchParams }: PageProps<"/portal/notifications">) {
  const user = await requirePatient();
  const { tab } = await searchParams;
  const key = typeof tab === "string" && TABS[tab] ? tab : "all";
  const items = await db.notification.findMany({ where: { userId: user.id, ...(key !== "all" ? { category: { in: TABS[key] } } : {}) }, orderBy: { createdAt: "desc" }, take: 50 });
  return (
    <div className="mx-auto max-w-[900px]">
      <PageTitle
        title="Notifications"
        subtitle="Reminders, messages and receipts."
        actions={
          <form action={markAllRead}>
            <Button variant="secondary" size="sm">
              Mark all read
            </Button>
          </form>
        }
      />
      <NotificationList items={items} tz={user.timeZone} base="/portal/notifications" active={key} tabs={[["all", "All"], ["visits", "Visits"], ["messages", "Messages"], ["billing", "Billing"]]} />
      <Card className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <b>Delivery</b>
          <div className="text-sm text-muted">Email and SMS reminders 24 hours and 1 hour before visits</div>
        </div>
        <Link href="/portal/settings" className="text-sm font-bold text-forest">
          Change in Settings
        </Link>
      </Card>
    </div>
  );
}
