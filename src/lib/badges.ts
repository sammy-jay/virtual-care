import "server-only";
import type { User } from "@prisma/client";
import { unreadForDoctor, unreadForPatient } from "./care";
import { db } from "./db";

/** Counts behind the nav badges and the bell dot. Shared by the portal layouts and /api/badges. */
export type Badges = { messages: number; inquiries: number; notifications: number };

export async function badgeCounts(user: Pick<User, "id" | "role">): Promise<Badges> {
  const isPatient = user.role === "PATIENT";
  const [messages, inquiries, notifications] = await Promise.all([
    isPatient ? unreadForPatient(user.id) : unreadForDoctor(),
    isPatient ? 0 : db.inquiry.count({ where: { status: "NEW" } }),
    db.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);
  return { messages, inquiries, notifications };
}
