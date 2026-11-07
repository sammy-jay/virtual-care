import "server-only";
import { PrismaClient } from "@prisma/client";
import { explicitNulls } from "../../prisma/explicit-nulls";

const make = () =>
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  }).$extends(explicitNulls);

const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof make> };

export const db = globalForPrisma.prisma ?? make();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
