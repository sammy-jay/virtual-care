import { getUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";

/** Polled by both rooms: who is waiting, admitted, ended. */
export async function GET(_: Request, ctx: RouteContext<"/api/visits/[id]/state">) {
  const user = await getUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const a = await db.appointment.findUnique({ where: { id } });
  if (!a || (user.role === "PATIENT" && a.patientId !== user.id)) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json({
    status: a.status,
    waitingSince: a.waitingSince?.toISOString() ?? null,
    admittedAt: a.admittedAt?.toISOString() ?? null,
    endedAt: a.endedAt?.toISOString() ?? null,
  });
}
