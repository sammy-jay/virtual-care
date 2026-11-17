// One-off: give existing accounts a `market` (added with the /ng Nigeria site).
// Patients whose profile region is Nigeria → NG; everyone else → US. Safe to re-run.
// Usage: npx tsx --env-file-if-exists=.env scripts/backfill-market.mts
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const ng = await db.patientProfile.findMany({ where: { region: "NG" }, select: { userId: true } });
const ngIds = ng.map((p) => ({ $oid: p.userId }));

const toNg = (await db.$runCommandRaw({
  update: "User",
  updates: [{ q: { market: { $exists: false }, _id: { $in: ngIds } }, u: { $set: { market: "NG" } }, multi: true }],
})) as { nModified?: number };
const toUs = (await db.$runCommandRaw({
  update: "User",
  updates: [{ q: { market: { $exists: false } }, u: { $set: { market: "US" } }, multi: true }],
})) as { nModified?: number };

console.log(`market set: ${toNg.nModified ?? 0} → NG, ${toUs.nModified ?? 0} → US`);
await db.$disconnect();
