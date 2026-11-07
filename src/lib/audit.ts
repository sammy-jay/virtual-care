import "server-only";
import { headers } from "next/headers";
import { db } from "@/lib/db";

/** Append-only access log (board 09.18): every view of patient data, kept 7 years. */
export async function logAccess(actor: { id: string; name: string; role: string } | null, action: string, patientId?: string | null) {
  const h = await headers();
  const label = !actor ? "System" : actor.role === "DOCTOR" ? "Dr. Oparaji" : actor.role === "STAFF" ? "Support" : actor.name;
  await db.accessLog.create({
    data: {
      actorId: actor?.id ?? null,
      actorLabel: label,
      action,
      patientId: patientId ?? null,
      location: h.get("x-vercel-ip-city") ?? (actor ? "Houston" : "Server"),
    },
  });
}
