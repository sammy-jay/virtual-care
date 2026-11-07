import type { Metadata } from "next";
import type { NotificationCategory } from "@prisma/client";
import { NotificationList } from "@/components/notification-list";
import { Button, PageTitle } from "@/components/ui";
import { requireDoctor } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { PRACTICE_TZ } from "@/lib/time";
import { markAllDoctorNotificationsRead } from "../../actions";

export const metadata: Metadata = { title: "Notifications" };

const TABS: Record<string, NotificationCategory[]> = { visits: ["VISITS", "CARE_PLANS"], messages: ["MESSAGES", "INQUIRIES"], payments: ["PAYMENTS"] };

export default async function DoctorNotificationsPage({ searchParams }: PageProps<"/doctor/notifications">) {
  const doc = await requireDoctor();
  const { tab } = await searchParams;
  const key = typeof tab === "string" && TABS[tab] ? tab : "all";
  const items = await db.notification.findMany({ where: { userId: doc.id, ...(key !== "all" ? { category: { in: TABS[key] } } : {}) }, orderBy: { createdAt: "desc" }, take: 60 });
  return (
    <div className="mx-auto max-w-[900px]">
      <PageTitle
        title="Notifications"
        subtitle="Everything that happened in your practice."
        actions={
          <form action={markAllDoctorNotificationsRead}>
            <Button variant="secondary" size="sm">
              Mark all read
            </Button>
          </form>
        }
      />
      <NotificationList items={items} tz={PRACTICE_TZ} base="/doctor/notifications" active={key} tabs={[["all", "All"], ["visits", "Visits"], ["messages", "Messages"], ["payments", "Payments"]]} />
    </div>
  );
}
