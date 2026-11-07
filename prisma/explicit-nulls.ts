import { Prisma } from "@prisma/client";

/**
 * MongoDB gotcha: Prisma omits unset optional fields, and `where: { field: null }` only matches
 * documents where the field is explicitly null. These fields are filtered with `null` across the
 * app, so every create writes them as explicit nulls.
 */
const NULLABLE: Record<string, string[]> = {
  User: ["deletedAt", "lockedUntil"],
  Message: ["readAt"],
  Notification: ["readAt"],
  Session: ["revokedAt"],
  AuthToken: ["usedAt"],
};

function fill(model: string, data: unknown) {
  const fields = NULLABLE[model];
  if (!fields || !data || typeof data !== "object") return data;
  const row = { ...(data as Record<string, unknown>) };
  for (const f of fields) if (row[f] === undefined) row[f] = null;
  return row;
}

export const explicitNulls = Prisma.defineExtension({
  name: "explicit-nulls",
  query: {
    $allModels: {
      async create({ model, args, query }) {
        args.data = fill(model, args.data) as typeof args.data;
        return query(args);
      },
      async createMany({ model, args, query }) {
        args.data = (Array.isArray(args.data) ? args.data.map((d) => fill(model, d)) : fill(model, args.data)) as typeof args.data;
        return query(args);
      },
      async upsert({ model, args, query }) {
        args.create = fill(model, args.create) as typeof args.create;
        return query(args);
      },
    },
  },
});
