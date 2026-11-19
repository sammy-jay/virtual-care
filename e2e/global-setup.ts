import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

/** Fresh seed before every run so tests start from the design's world. */
export default function globalSetup() {
  // The seed wipes the database. Only ever do that to a local one.
  const url = process.env.DATABASE_URL ?? readEnvUrl();
  if (!/@?(localhost|127\.0\.0\.1)[:/]/.test(url) && process.env.E2E_ALLOW_REMOTE_DB !== "1") {
    throw new Error(
      `E2E tests reseed (wipe) the database, and DATABASE_URL is not local.\n` +
        `Run them against the local one:  npm run db:local, then\n` +
        `  DATABASE_URL="mongodb://127.0.0.1:27027/virtualcare?replicaSet=rs0&directConnection=true" npm run test:e2e`,
    );
  }
  execSync("npm run db:seed", { stdio: "inherit" });
}

function readEnvUrl() {
  try {
    const env = readFileSync(".env", "utf8");
    return env.match(/^DATABASE_URL\s*=\s*"?([^"\r\n]*)"?/m)?.[1] ?? "";
  } catch {
    return "";
  }
}
