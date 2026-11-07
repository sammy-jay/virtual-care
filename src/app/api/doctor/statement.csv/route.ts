import { getUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";

const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export async function GET() {
  const user = await getUser();
  if (!user || user.role === "PATIENT") return new Response("Forbidden", { status: 403 });
  const since = new Date(Date.now() - 365 * 86400_000);
  const rows = await db.payment.findMany({ where: { createdAt: { gte: since } }, include: { patient: true }, orderBy: { createdAt: "desc" } });
  const csv = [
    ["Date", "Receipt", "Patient", "Description", "Status", "Amount", "Refunded", "Currency"],
    ...rows.map((p) => [p.createdAt.toISOString().slice(0, 10), p.receiptNo, p.patient.name, p.description, p.status, (p.amountCents / 100).toFixed(2), (p.refundedCents / 100).toFixed(2), p.currency]),
  ];
  return new Response(csv.map((r) => r.map(esc).join(",")).join("\n"), { headers: { "Content-Type": "text/csv", "Content-Disposition": 'attachment; filename="statement.csv"' } });
}
