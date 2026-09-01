import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/design-lab",
  outputDir: "./test-results/design-lab",
  fullyParallel: false,
  retries: 0,
  reporter: "line",
  use: {
    baseURL: "http://127.0.0.1:3107",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm dev --hostname 127.0.0.1 --port 3107",
    url: "http://127.0.0.1:3107/design-lab/v1",
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
