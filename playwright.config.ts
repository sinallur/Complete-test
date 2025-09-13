import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./",
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: true,
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    video: "off",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
