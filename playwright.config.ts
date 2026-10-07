import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

/**
 * E2E against demo data (`pnpm db:seed:demo`). Locally a production server is started; set
 * E2E_BASE_URL to run the same suite against a deployed preview or production URL.
 */
const PORT = Number(process.env.PORT ?? 3100);
const remote = process.env.E2E_BASE_URL;
const chromium = process.env.PW_CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const launchOptions = existsSync(chromium) ? { executablePath: chromium } : {};

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  use: { baseURL: remote ?? `http://localhost:${PORT}`, trace: "retain-on-failure", launchOptions },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    { name: "desktop", use: { ...devices["Desktop Chrome"], launchOptions, storageState: "tests/e2e/.auth/reader.json" }, dependencies: ["setup"] },
    { name: "mobile", use: { ...devices["Pixel 7"], launchOptions, storageState: "tests/e2e/.auth/reader.json" }, dependencies: ["setup"] },
  ],
  webServer: remote
    ? undefined
    : { command: `pnpm start --port ${PORT}`, port: PORT, reuseExistingServer: !process.env.CI, timeout: 120_000 },
});
