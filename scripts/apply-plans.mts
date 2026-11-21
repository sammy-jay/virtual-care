/**
 * Puts the membership catalog from src/lib/plan-catalog.ts into an existing database:
 *   npm run plans:apply            show what would change
 *   npm run plans:apply -- --yes   make the change
 *
 * The single plan is created or updated (price, features, inclusions). Every other plan is taken off
 * sale (active = false), never deleted: anyone already on one keeps it at its current price until they
 * switch or cancel, and it can be brought back later.
 */
import { PrismaClient } from "@prisma/client";
import { MEMBERSHIP_PLAN, membershipPlanData } from "../src/lib/plan-catalog";

const db = new PrismaClient();
const apply = process.argv.includes("--yes");
const usd = (c: number) => `$${(c / 100).toFixed(0)}`;
const ngn = (n: number) => `₦${n.toLocaleString("en-US")}`;

try {
  const host = (process.env.DATABASE_URL ?? "").replace(/^mongodb(\+srv)?:\/\/([^@]*@)?/, "").split(/[/?]/)[0];
  console.log(`Database: ${host || "(DATABASE_URL not set)"}\n`);

  const plans = await db.plan.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { memberships: { where: { status: { not: "CANCELED" } } } } } } });
  console.log("Plans now:");
  for (const p of plans) console.log(`  ${p.active ? "on sale " : "hidden  "} ${p.name.padEnd(14)} ${usd(p.monthlyPriceCents).padStart(5)} / ${ngn(p.monthlyPriceNgn).padStart(9)}   ${p._count.memberships} active member(s)`);

  const types = await db.visitType.findMany({ where: { slug: { in: [...MEMBERSHIP_PLAN.includedVisitTypeSlugs] } } });
  const missing = MEMBERSHIP_PLAN.includedVisitTypeSlugs.filter((s) => !types.some((t) => t.slug === s));
  if (missing.length) throw new Error(`Visit type(s) not found: ${missing.join(", ")}. Is this the right database?`);

  const others = plans.filter((p) => p.slug !== MEMBERSHIP_PLAN.slug && p.active);
  console.log(`\nWill set: ${MEMBERSHIP_PLAN.name} at ${usd(MEMBERSHIP_PLAN.monthlyPriceCents)}/month and ${ngn(MEMBERSHIP_PLAN.monthlyPriceNgn)}/month, on sale`);
  if (others.length) console.log(`Will hide from sale: ${others.map((p) => `${p.name}${p._count.memberships ? ` (its ${p._count.memberships} member(s) keep it)` : ""}`).join(", ")}`);

  if (!apply) {
    console.log("\nNothing changed. Run again with --yes to apply:  npm run plans:apply -- --yes");
  } else {
    const data = membershipPlanData(types.map((t) => t.id));
    await db.plan.upsert({ where: { slug: MEMBERSHIP_PLAN.slug }, create: data, update: data });
    await db.plan.updateMany({ where: { slug: { not: MEMBERSHIP_PLAN.slug }, active: true }, data: { active: false } });
    console.log("\nDone.");
  }
} finally {
  await db.$disconnect();
}
