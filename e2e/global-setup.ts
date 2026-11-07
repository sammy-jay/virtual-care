import { execSync } from "node:child_process";

/** Fresh seed before every run so tests start from the design's world. */
export default function globalSetup() {
  execSync("npm run db:seed", { stdio: "inherit" });
}
