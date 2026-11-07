import { logAccess } from "@/lib/audit";
import { getUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";

const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export async function GET() {
  const user = await getUser();
  if (!user || user.role === "PATIENT") return new Response("Forbidden", { status: 403 });
  const patients = await db.user.findMany({
    where: { role: "PATIENT", deletedAt: null },
    include: { profile: true, memberships: { where: { status: { in: ["ACTIVE", "PAST_DUE"] } }, include: { plan: true } } },
  });
  const rows = [["Name", "Email", "Phone", "Plan", "City", "Joined"], ...patients.map((p) => [p.name, p.email, p.phone, p.memberships[0]?.plan.name ?? "Pay per visit", p.profile?.city, p.createdAt.toISOString().slice(0, 10)])];
  await logAccess(user, "Exported patient list", null);
  return new Response(rows.map((r) => r.map(esc).join(",")).join("\n"), { headers: { "Content-Type": "text/csv", "Content-Disposition": 'attachment; filename="patients.csv"' } });
}
