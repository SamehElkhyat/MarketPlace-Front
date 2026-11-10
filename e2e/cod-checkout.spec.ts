import { expect, test, type Page } from "@playwright/test";

const CUSTOMER = { email: "customer@atelier.test", password: "Demo#12345" };
const ADMIN = { email: "admin@atelier.test", password: "Admin#12345" };

async function signIn(page: Page, who: { email: string; password: string }) {
  await page.getByLabel("E-mail").fill(who.email);
  await page.getByLabel("Password").fill(who.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

test.describe("Scenario 1 & 5 — cash-on-delivery checkout", () => {
  test("a guest shops, signs in at checkout, sees online methods as 'coming soon', and places a COD order", async ({ page }) => {
    // ── browse + variant selection + add to cart (as a guest) ───────────────────────────────
    await page.goto("/en/products/heavyweight-cotton-tee");
    await expect(page.getByRole("heading", { level: 1, name: "Heavyweight Cotton Tee" })).toBeVisible();

    await page.getByRole("radio", { name: "M", exact: true }).click();
    await page.getByRole("button", { name: "Add to cart" }).click();
    await expect(page.getByRole("button", { name: "Added" })).toBeVisible(); // button reads "Added" for ~2s

    // ── cart drawer shows the server-priced line ─────────────────────────────────────────
    await page.getByRole("button", { name: /^Cart/ }).click();
    const drawer = page.getByRole("dialog", { name: "Your cart" });
    await expect(drawer.getByText("Heavyweight Cotton Tee")).toBeVisible();
    await drawer.getByRole("link", { name: "Checkout" }).click();

    // ── guest checkout: sign in inline; the guest cart merges into the account cart ─────────
    await expect(page).toHaveURL(/\/en\/checkout/);
    await signIn(page, CUSTOMER);
    await expect(page.getByText(/Signed in as/)).toBeVisible();
    // (Next keeps the previous route mounted but hidden, so scope assertions to the visible summary)
    const summary = page.getByRole("complementary", { name: "Order summary" });
    await expect(summary.getByText("Heavyweight Cotton Tee")).toBeVisible(); // survived the merge

    // ── payment methods: COD live, online ones disabled + badge ─────────────────────────────
    const cod = page.getByRole("radio", { name: /Cash on delivery/ });
    await expect(cod).toBeChecked();
    for (const name of [/Credit \/ debit card/, /Mobile wallet/, /Pay at Fawry/]) {
      await expect(page.getByRole("radio", { name })).toBeDisabled();
    }
    await expect(page.getByText("Coming soon").first()).toBeVisible();
    await expect(page.getByText("Paying by card, wallet and Fawry is coming soon.")).toBeVisible();

    // ── totals come from the server; place the order ──────────────────────────────────────
    const placeOrder = page.getByRole("button", { name: "Place order" });
    await expect(placeOrder).toBeEnabled();
    await placeOrder.click();

    await expect(page).toHaveURL(/\/en\/account\/orders\/ORD-\d+\?placed=1/);
    await expect(page.getByText("Thank you — your order is in!")).toBeVisible();
    await expect(page.getByText("Awaiting confirmation").first()).toBeVisible();
  });

  test("Scenario 2 — the admin confirms the order and the customer sees it on the timeline", async ({ browser }) => {
    // customer places an order
    const customer = await browser.newContext();
    const cp = await customer.newPage();
    await cp.goto("/en/products/washed-linen-shirt");
    await cp.getByRole("button", { name: "Add to cart" }).click();
    await expect(cp.getByRole("button", { name: "Added" })).toBeVisible();
    await cp.goto("/en/checkout");
    await signIn(cp, CUSTOMER);
    await expect(cp.getByRole("button", { name: "Place order" })).toBeEnabled();
    await cp.getByRole("button", { name: "Place order" }).click();
    await expect(cp).toHaveURL(/\/account\/orders\/(ORD-\d+)/);
    const orderNumber = /(ORD-\d+)/.exec(cp.url())![1]!;

    // admin confirms it
    const admin = await browser.newContext();
    const ap = await admin.newPage();
    await ap.goto("/en/login");
    await signIn(ap, ADMIN);
    await expect(ap).toHaveURL(/\/en\/account/); // wait until the session is established before navigating away
    await ap.goto("/en/admin/orders");
    await ap.getByPlaceholder("Order no., e-mail or phone").fill(orderNumber);
    await ap.getByRole("row", { name: new RegExp(orderNumber) }).click();
    await expect(ap.getByRole("heading", { name: orderNumber })).toBeVisible();

    // only transitions the state machine allows are offered: confirm + cancel, NOT "mark shipped"
    await expect(ap.getByRole("button", { name: "Mark shipped" })).toHaveCount(0);
    await ap.getByRole("button", { name: "Confirm order" }).click();
    await ap.getByRole("dialog").getByRole("button", { name: "Confirm", exact: true }).click();
    await expect(ap.getByText("Order updated")).toBeVisible();
    await expect(ap.getByRole("button", { name: "Start processing" })).toBeVisible();

    // the customer sees the new step with a real timestamp
    await cp.reload();
    await expect(cp.getByRole("list", { name: "Order progress" }).getByText("Confirmed")).toBeVisible();

    await customer.close();
    await admin.close();
  });

  test("Scenario 4 — cancelling before processing restores the order status for the customer", async ({ page }) => {
    await page.goto("/en/products/washed-linen-shirt");
    await page.getByRole("button", { name: "Add to cart" }).click();
    await expect(page.getByRole("button", { name: "Added" })).toBeVisible();
    await page.goto("/en/checkout");
    await signIn(page, CUSTOMER);
    await page.getByRole("button", { name: "Place order" }).click();
    await expect(page).toHaveURL(/\/account\/orders\/ORD-/);

    page.once("dialog", (dialog) => void dialog.accept());
    await page.getByRole("button", { name: "Cancel order" }).click();
    await expect(page.getByText("Order cancelled").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel order" })).toHaveCount(0);
  });
});

test.describe("Language & direction", () => {
  test("the Arabic storefront is RTL and switching language keeps the page", async ({ page }) => {
    await page.goto("/ar/c/fashion");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await expect(page.getByRole("heading", { level: 1, name: "موضة" })).toBeVisible();

    await page.getByRole("button", { name: "تغيير اللغة" }).click();
    await expect(page).toHaveURL(/\/en\/c\/fashion/);
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  });

  test("filters live in the URL, so a filtered link opens the same results", async ({ page }) => {
    await page.goto("/en/c/fashion?attr=size:M&sort=price_asc");
    await expect(page.getByText(/\d+ products?/)).toBeVisible();
    await expect(page.getByRole("button", { name: /Remove filter Size: M/ })).toBeVisible();
    const first = page.locator("article h3").first();
    await expect(first).toBeVisible();
  });
});
