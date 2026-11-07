import { getUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";

const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export async function GET() {
  const user = await getUser();
  if (!user || user.role === "PATIENT") return new Response("Forbidden", { status: 403 });
  const rows = await db.accessLog.findMany({ orderBy: { createdAt: "desc" } });
  const csv = [["When (UTC)", "Who", "Action", "Where"], ...rows.map((r) => [r.createdAt.toISOString(), r.actorLabel, r.action, r.location])];
  return new Response(csv.map((r) => r.map(esc).join(",")).join("\n"), { headers: { "Content-Type": "text/csv", "Content-Disposition": 'attachment; filename="access-log.csv"' } });
}
