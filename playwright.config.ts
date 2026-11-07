import { defineConfig } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "e2e",
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  globalSetup: "./e2e/global-setup.ts",
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure", actionTimeout: 30_000, navigationTimeout: 90_000 },
  webServer: { command: `npx next dev -p ${PORT}`, url: `http://localhost:${PORT}/sign-in`, reuseExistingServer: true, timeout: 180_000 },
});
