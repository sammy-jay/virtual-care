import { getUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** "Add to calendar" — an .ics file for one visit. No clinical content. */
export async function GET(_: Request, ctx: RouteContext<"/api/visits/[id]/ics">) {
  const user = await getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { id } = await ctx.params;
  const a = await db.appointment.findUnique({ where: { id }, include: { visitType: true } });
  if (!a || (user.role === "PATIENT" && a.patientId !== user.id)) return new Response("Not found", { status: 404 });
  const app = process.env.APP_URL ?? "http://localhost:3000";
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Dr Oparaji Virtual Care//EN",
    "BEGIN:VEVENT",
    `UID:${a.id}@virtualcare`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(a.startsAt)}`,
    `DTEND:${stamp(a.endsAt)}`,
    `SUMMARY:${a.visitType.name} with Dr. Oparaji`,
    `DESCRIPTION:Join from your portal: ${app}/portal/visits/${a.id}/precheck`,
    `URL:${app}/portal/visits/${a.id}/precheck`,
    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    "DESCRIPTION:Visit starts in 1 hour",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return new Response(ics, {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="visit-${a.id}.ics"` },
  });
}
