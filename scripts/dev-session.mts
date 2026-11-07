// Dev helper: prints a session cookie for a seeded user. Usage: tsx --env-file=.env scripts/dev-session.ts adaeze@example.com
import { createHash, randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const email = process.argv[2] ?? "adaeze@example.com";
const user = await db.user.findUniqueOrThrow({ where: { email } });
const token = randomBytes(32).toString("base64url");
await db.session.create({ data: { userId: user.id, tokenHash: createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + 864e5), device: "Dev script" } });
console.log(token);
await db.$disconnect();
