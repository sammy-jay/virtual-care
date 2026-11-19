import { getUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";

/**
 * WebRTC signalling for peer-to-peer video visits. Each side posts "hello" (I am here, with my
 * session id), and then offer/answer/ICE candidates addressed to the other side's session. Media
 * never passes through this server. Only the visit's patient and the doctor can use it, and only
 * while the visit is live (admitted, not ended).
 */
const KINDS = new Set(["hello", "offer", "answer", "candidate"]);
const WINDOW_MS = 6 * 3600_000;

async function access(id: string) {
  const user = await getUser();
  if (!user) return { error: Response.json({ error: "unauthorized" }, { status: 401 }) };
  const a = await db.appointment.findUnique({ where: { id }, select: { id: true, patientId: true, status: true, admittedAt: true, endedAt: true } });
  const isDoctor = user.role !== "PATIENT";
  if (!a || (!isDoctor && a.patientId !== user.id)) return { error: Response.json({ error: "not found" }, { status: 404 }) };
  if (a.status !== "SCHEDULED" || !a.admittedAt || a.endedAt) return { error: Response.json({ error: "visit not live" }, { status: 409 }) };
  return { a, role: isDoctor ? "doctor" : "patient" };
}

export async function GET(req: Request, ctx: RouteContext<"/api/visits/[id]/signal">) {
  const { id } = await ctx.params;
  const r = await access(id);
  if ("error" in r) return r.error;
  const url = new URL(req.url);
  const session = url.searchParams.get("session") ?? "";
  const after = new Date(Number(url.searchParams.get("after")) || Date.now() - WINDOW_MS);
  const other = r.role === "doctor" ? "patient" : "doctor";
  const [hello, signals] = await Promise.all([
    db.videoSignal.findFirst({ where: { appointmentId: id, role: other, kind: "hello", createdAt: { gte: new Date(Date.now() - WINDOW_MS) } }, orderBy: { createdAt: "desc" } }),
    db.videoSignal.findMany({ where: { appointmentId: id, role: other, to: session, createdAt: { gte: after } }, orderBy: { createdAt: "asc" }, take: 200 }),
  ]);
  const out = (s: { id: string; session: string; kind: string; payload: string | null; createdAt: Date }) => ({ id: s.id, session: s.session, kind: s.kind, payload: s.payload, at: s.createdAt.getTime() });
  return Response.json({ remote: hello ? hello.session : null, signals: signals.map(out) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request, ctx: RouteContext<"/api/visits/[id]/signal">) {
  const { id } = await ctx.params;
  const r = await access(id);
  if ("error" in r) return r.error;
  const body = (await req.json().catch(() => null)) as { session?: string; to?: string; kind?: string; payload?: string } | null;
  if (!body?.session || !body.kind || !KINDS.has(body.kind) || body.session.length > 64) return Response.json({ error: "bad request" }, { status: 400 });
  if (body.payload && body.payload.length > 30_000) return Response.json({ error: "too large" }, { status: 413 });
  await db.videoSignal.create({
    data: { appointmentId: id, role: r.role, session: body.session, to: body.kind === "hello" ? null : (body.to ?? null), kind: body.kind, payload: body.payload ?? null },
  });
  return new Response(null, { status: 204 });
}
