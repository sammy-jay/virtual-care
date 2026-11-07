import "server-only";
import { randomInt } from "node:crypto";
import { db } from "@/lib/db";
import { randomToken, sha256 } from "./session";

export const EMAIL_CODE_MINUTES = 15;
export const RESET_LINK_MINUTES = 60;

/** 6-digit email verification code (board 03.8). Replaces any earlier unused code. */
export async function issueEmailCode(userId: string) {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.authToken.deleteMany({ where: { userId, purpose: "EMAIL_VERIFY", usedAt: null } });
  await db.authToken.create({
    data: {
      userId,
      purpose: "EMAIL_VERIFY",
      tokenHash: sha256(`${userId}:${code}`),
      expiresAt: new Date(Date.now() + EMAIL_CODE_MINUTES * 60_000),
    },
  });
  return code;
}

export async function consumeEmailCode(userId: string, code: string) {
  const token = await db.authToken.findUnique({ where: { tokenHash: sha256(`${userId}:${code}`) } });
  if (!token || token.usedAt || token.purpose !== "EMAIL_VERIFY") return "invalid" as const;
  if (token.expiresAt < new Date()) return "expired" as const;
  await db.authToken.update({ where: { id: token.id }, data: { usedAt: new Date() } });
  return "ok" as const;
}

/** Single-use reset link valid for 60 minutes (boards 03.6, 03.7, 03.9). */
export async function issueResetToken(userId: string) {
  const raw = randomToken();
  await db.authToken.create({
    data: {
      userId,
      purpose: "PASSWORD_RESET",
      tokenHash: sha256(raw),
      expiresAt: new Date(Date.now() + RESET_LINK_MINUTES * 60_000),
    },
  });
  return raw;
}

export async function findResetToken(raw: string) {
  const token = await db.authToken.findUnique({ where: { tokenHash: sha256(raw) } });
  if (!token || token.purpose !== "PASSWORD_RESET" || token.usedAt || token.expiresAt < new Date()) return null;
  return token;
}
