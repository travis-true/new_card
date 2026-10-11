import fs from "node:fs";
import { defineConfig } from "@playwright/test";

const PORT = 3100;
const chromium = process.env.CHROMIUM_PATH ?? (fs.existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);

export default defineConfig({
  testDir: "e2e",
  workers: 1,
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    launchOptions: chromium ? { executablePath: chromium } : {},
    trace: "retain-on-failure",
  },
  webServer: {
    command: `rm -rf .e2e-data && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      DATA_DIR: ".e2e-data",
      SESSION_SECRET: "e2e-secret-e2e-secret-e2e-secret",
      IDENTIFY_MODE: "mock",
    },
  },
});
