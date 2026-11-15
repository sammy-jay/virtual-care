import { runJobs } from "@/lib/jobs";

/**
 * Background jobs, called with `Authorization: Bearer $CRON_SECRET`.
 * Vercel Hobby runs it once a day (vercel.json, 12:00 UTC). Any external scheduler may call it more
 * often (e.g. every 10 minutes) to send 1-hour reminders on time; every step is idempotent.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  return Response.json(await runJobs());
}
