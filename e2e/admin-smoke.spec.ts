import { expect, test } from "@playwright/test";

const ADMIN = { email: "admin@atelier.test", password: "Admin#12345" };

const PAGES = [
  "/en/admin",
  "/en/admin/products",
  "/en/admin/products/new",
  "/en/admin/categories",
  "/en/admin/brands",
  "/en/admin/collections",
  "/en/admin/orders",
  "/en/admin/customers",
  "/en/admin/inventory",
  "/en/admin/coupons",
  "/en/admin/shipping",
  "/en/admin/audit",
  "/ar/admin",
  "/ar/admin/products/new",
];

test("every back-office page renders for an admin without errors (English + Arabic)", async ({ page }) => {
  test.setTimeout(180_000); // fourteen pages; a cold `next dev` compiles each route on first visit
  const problems: string[] = [];
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    // Hydration/React errors surface here; failed network noise from third-party image hosts is not ours.
    if (message.type() === "error" && !/Failed to load resource|ERR_|favicon/.test(message.text())) problems.push(`console: ${message.text().slice(0, 300)}`);
  });
  page.on("response", (response) => {
    if (response.url().includes("/api/") && response.status() >= 500) problems.push(`HTTP ${response.status()} ${response.url()}`);
  });

  await page.goto("/en/login");
  await page.getByLabel("E-mail").fill(ADMIN.email);
  await page.getByLabel("Password").fill(ADMIN.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/account/);

  for (const path of PAGES) {
    await test.step(path, async () => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
      await expect(page.getByText("Something went wrong")).toHaveCount(0);
      await expect(page.getByText("حدث خطأ")).toHaveCount(0);
      await page.waitForLoadState("networkidle");
    });
  }

  expect(problems, problems.join("\n")).toEqual([]);
});
