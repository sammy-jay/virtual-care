// Local MongoDB replica set for development (Prisma needs a replica set).
// Data persists in .mongo-data/. Usage: npm run db:local  → then DATABASE_URL=mongodb://127.0.0.1:27027/virtualcare?replicaSet=rs0
import { mkdirSync } from "node:fs";
import { MongoMemoryReplSet } from "mongodb-memory-server";

mkdirSync(".mongo-data", { recursive: true });
const rs = await MongoMemoryReplSet.create({
  replSet: { name: "rs0", count: 1, storageEngine: "wiredTiger" },
  instanceOpts: [{ port: 27027, dbPath: ".mongo-data", ip: "127.0.0.1" }],
});
console.log(`MongoDB replica set ready: mongodb://127.0.0.1:27027/virtualcare?replicaSet=rs0&directConnection=true`);
const stop = async () => {
  await rs.stop({ doCleanup: false });
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
setInterval(() => {}, 1 << 30);
