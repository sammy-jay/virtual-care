import { runJobs } from "@/lib/jobs";

/**
 * Background jobs. Call every 5 minutes with `Authorization: Bearer $CRON_SECRET`
 * (Vercel Cron, GitHub Actions, or any scheduler).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  return Response.json(await runJobs());
}
