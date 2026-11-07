import "server-only";
import type { NotificationCategory } from "@prisma/client";
import { db } from "@/lib/db";

export async function notify(userId: string, n: { category: NotificationCategory; title: string; body: string; href?: string; amount?: string }) {
  await db.notification.create({ data: { userId, ...n } });
}

export async function notifyDoctors(n: { category: NotificationCategory; title: string; body: string; href?: string; amount?: string }) {
  const doctors = await db.user.findMany({ where: { role: "DOCTOR" }, select: { id: true } });
  await db.notification.createMany({ data: doctors.map((d) => ({ userId: d.id, ...n })) });
}
