import { logAccess } from "@/lib/audit";
import { getUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";

/** Patient data export (05.13 / 09.19): visits, care plans, messages and receipts as JSON. */
export async function GET(_: Request, ctx: RouteContext<"/api/export/[id]">) {
  const user = await getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { id } = await ctx.params;
  const req = await db.dataRequest.findUnique({ where: { id } });
  if (!req || req.status !== "COMPLETED" || (user.role === "PATIENT" && req.patientId !== user.id)) return new Response("Not found", { status: 404 });
  const pid = req.patientId;
  const [patient, visits, plans, messages, payments, measurements] = await Promise.all([
    db.user.findUnique({ where: { id: pid }, select: { name: true, email: true, phone: true, timeZone: true, createdAt: true, profile: true } }),
    db.appointment.findMany({ where: { patientId: pid }, include: { visitType: { select: { name: true } } } }),
    db.carePlan.findMany({ where: { patientId: pid, status: "PUBLISHED" } }),
    db.message.findMany({ where: { conversation: { patientId: pid } }, select: { body: true, fromDoctor: true, createdAt: true } }),
    db.payment.findMany({ where: { patientId: pid }, select: { receiptNo: true, description: true, amountCents: true, currency: true, status: true, createdAt: true } }),
    db.measurement.findMany({ where: { patientId: pid } }),
  ]);
  await logAccess(user, "Downloaded data export", pid);
  return new Response(JSON.stringify({ exportedAt: new Date(), patient, visits, carePlans: plans, messages, payments, measurements }, null, 2), {
    headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="my-data-${new Date().toISOString().slice(0, 10)}.json"` },
  });
}
