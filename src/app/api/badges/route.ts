import { getUser } from "@/lib/auth/dal";
import { badgeCounts } from "@/lib/badges";

/** Polled by the portal shells so nav badges and the bell update without a reload. */
export async function GET() {
  const user = await getUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json(await badgeCounts(user), { headers: { "Cache-Control": "no-store" } });
}
