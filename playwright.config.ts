import { defineConfig, devices } from "@playwright/test";

/**
 * E2E runs against a live stack: MongoDB (replica set) + the API + this storefront, seeded with demo data
 * (`npm run seed` in /backend). In CI the workflow boots all three; locally point E2E_BASE_URL at a running app.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false, // scenarios share one seeded database
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    locale: "en-US",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
