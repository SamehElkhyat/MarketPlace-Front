import { expect, test, type Page } from "@playwright/test";

const ADMIN = { email: "admin@atelier.test", password: "Admin#12345" };
const DEMO = { email: "demo@atelier.test", password: "Demo#12345" };

async function signInAs(page: Page, who: { email: string; password: string }) {
  await page.goto("/en/login");
  await page.getByLabel("E-mail").fill(who.email);
  await page.getByLabel("Password").fill(who.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/account/);
}

test.describe("Back office — product form", () => {
  test("an admin can fill the form, add an image by URL and save", async ({ page }) => {
    await signInAs(page, ADMIN);
    await page.goto("/en/admin/products/new");

    // Saving an empty form is never a silent no-op: it lists exactly what is missing.
    const save = page.getByRole("button", { name: "Save", exact: true });
    await expect(save).toBeEnabled();
    await save.click();
    const missing = page.getByRole("alert").filter({ hasText: "Complete these before saving:" });
    await expect(missing).toContainText("English title");
    await expect(missing).toContainText("Category");
    await expect(missing).toContainText("Price for");

    const unique = `E2E Linen ${Date.now()}`;
    await page.getByLabel("Title (English)").fill(unique);
    await page.getByLabel("Title (Arabic)").fill("كتان تجريبي");

    await page.getByRole("combobox").first().click();
    await page.getByRole("option", { name: /Fashion/ }).first().click();

    await page.getByPlaceholder(/image URL/i).fill("https://images.unsplash.com/photo-1523381210434-271e8be1f52b");
    await page.getByRole("button", { name: "Add", exact: true }).click();

    // Arabic-keyboard digits are accepted; the SKU is generated for the default variant (none typed)
    await page.getByLabel("Price (EGP)").first().fill("٢٤٩٫٥٠");
    await save.click();

    await expect(page.getByText("Product saved")).toBeVisible();
    await expect(page).toHaveURL(/\/en\/admin\/products$/);
    await page.getByPlaceholder("Search products…").fill(unique);
    const row = page.getByRole("row", { name: new RegExp(unique) });
    await expect(row).toBeVisible();
    await expect(row).toContainText("249.50");

    // …and the same product can be edited and saved again
    await row.click();
    // (Next keeps the previous route mounted but hidden, so target the visible form only)
    await page.getByLabel("Title (English)").locator("visible=true").fill(`${unique} v2`);
    await save.locator("visible=true").click();
    await expect(page.getByText("Product saved")).toBeVisible();
  });

  // Cloudinary is mocked so these run the same everywhere (CI has no Cloudinary account).
  const PNG = { name: "photo.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgo=", "base64") };
  const SIGNATURE = { cloudName: "demo", apiKey: "123", timestamp: 1_700_000_000, folder: "products", signature: "abc" };

  async function openNewProduct(page: Page) {
    await signInAs(page, ADMIN);
    await page.route("**/api/admin/uploads/sign", (route) => route.fulfill({ json: SIGNATURE }));
    await page.goto("/en/admin/products/new");
    return page.locator('input[type="file"]').locator("visible=false"); // dropzone input is visually hidden
  }

  test("an uploaded image lands in the gallery as the primary photo", async ({ page }) => {
    const input = await openNewProduct(page);
    await page.route("https://api.cloudinary.com/**", (route) =>
      route.fulfill({ json: { secure_url: "https://res.cloudinary.com/demo/image/upload/v1/products/photo.png", public_id: "products/photo" } }),
    );
    await input.setInputFiles(PNG);
    await expect(page.getByText("Primary", { exact: true })).toBeVisible();
  });

  test("when Cloudinary refuses an upload, the admin sees Cloudinary's own reason", async ({ page }) => {
    const input = await openNewProduct(page);
    await page.route("https://api.cloudinary.com/**", (route) =>
      route.fulfill({ status: 401, json: { error: { message: "Invalid Signature abc. String to sign - 'folder=products&timestamp=1'." } } }),
    );
    await input.setInputFiles(PNG);
    await expect(page.getByText(/Cloudinary refused the upload: Invalid Signature/)).toBeVisible();
  });

  test("the read-only demo reviewer is told why saving and uploading are off", async ({ page }) => {
    await signInAs(page, DEMO);
    await page.goto("/en/admin/products/new");
    await expect(page.getByText(/read-only demo account/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Save", exact: true })).toBeDisabled();
  });
});
