import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const FIXTURE = path.join(import.meta.dirname, "fixtures", "card.png");
const OWNER_EMAIL = "true.travis@gmail.com";

async function signup(page: Page, name: string) {
  await page.goto("/signup");
  await page.getByLabel("Email").fill(`${name}@example.com`);
  await page.getByLabel("Username").fill(name);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/scan$/);
}

async function login(page: Page, name: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(`${name}@example.com`);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/scan$/);
}

test("anonymous visitors see the footer links and are sent to log in", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Scan a sports card/i })).toBeVisible();
  const contact = page.getByRole("link", { name: "Contact" }).last();
  const feature = page.getByRole("link", { name: "Feature Requests" });
  await expect(contact).toHaveAttribute("href", new RegExp(`^mailto:${OWNER_EMAIL}\\?subject=`));
  await expect(feature).toHaveAttribute("href", new RegExp(`^mailto:${OWNER_EMAIL}\\?subject=.*feature.*&body=`, "i"));
  await expect(page.getByText(/at your own risk/i).first()).toBeVisible();
  await page.goto("/scan");
  await expect(page).toHaveURL(/\/login$/);
});

test.describe.serial("collector flow", () => {
  let cardUrl = "";
  let privateCardUrl = "";
  let privateImageUrl = "";

  test("scan front and back, review, save and list a card", async ({ page }) => {
    await signup(page, "alice");
    await page.getByTestId("front-input").setInputFiles(FIXTURE);
    await page.getByTestId("back-input").setInputFiles(FIXTURE);
    await page.getByRole("button", { name: "Identify card" }).click();

    await expect(page.getByTestId("identification-banner")).toContainText("Demo identification");
    await expect(page.getByLabel("Player")).toHaveValue("Sample Player");
    await expect(page.getByLabel("Set", { exact: true })).toHaveValue("Chrome");
    await expect(page.getByLabel("Rookie card")).toBeChecked();

    await page.getByLabel("Player").fill("Test Player");
    await page.getByLabel("For sale").check();
    await page.getByLabel("Listing note").fill("Open to offers");
    await page.getByRole("button", { name: "Save to collection" }).click();

    await expect(page).toHaveURL(/\/cards\/\d+$/);
    cardUrl = new URL(page.url()).pathname;
    await expect(page.getByRole("heading", { name: "Test Player", level: 1 })).toBeVisible();
    await expect(page.getByTestId("listing-panel")).toContainText("For sale");
    await expect(page.getByAltText("Back of Test Player")).toBeVisible();
  });

  test("contact link validation and saving", async ({ page }) => {
    await login(page, "alice");

    await page.goto("/settings");
    await page.getByLabel("Contact link for trades and sales").fill("javascript:alert(1)");
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(page.locator("p.error")).toContainText("Contact link must be");

    await page.getByLabel("Contact link for trades and sales").fill("alice@example.com");
    await page.getByLabel("Bio").fill("Collecting baseball rookies.");
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(page.getByText("Profile saved")).toBeVisible();
  });

  test("private collections and their photos stay private", async ({ page, browser }) => {
    await login(page, "alice");

    await page.goto("/collections");
    await page.getByLabel("Name").fill("Vault");
    await page.getByLabel(/Public/).uncheck();
    await page.getByRole("button", { name: "Create collection" }).click();
    await expect(page).toHaveURL(/\/collections\/\d+$/);

    await page.goto("/scan");
    await page.getByTestId("front-input").setInputFiles(FIXTURE);
    await page.getByRole("button", { name: "Identify card" }).click();
    await page.getByLabel("Add to collection").selectOption({ label: "Vault" });
    await page.getByLabel("Player").fill("Hidden Player");
    await page.getByLabel("For trade").check();
    await page.getByRole("button", { name: "Save to collection" }).click();
    await expect(page).toHaveURL(/\/cards\/\d+$/);
    privateCardUrl = new URL(page.url()).pathname;
    privateImageUrl = (await page.getByAltText("Front of Hidden Player").getAttribute("src"))!;
    expect(privateImageUrl).toMatch(/^\/api\/images\//);

    // Owner can still load it; an anonymous visitor cannot.
    expect((await page.request.get(privateImageUrl)).status()).toBe(200);
    const anon = await browser.newContext();
    const anonPage = await anon.newPage();
    const base = "http://localhost:3100";
    expect((await anonPage.request.get(base + privateImageUrl)).status()).toBe(404);
    expect((await anonPage.goto(base + privateCardUrl))?.status()).toBe(404);
    await anonPage.goto(`${base}/market`);
    await expect(anonPage.getByText("Hidden Player")).toHaveCount(0);
    await anon.close();
  });

  test("another user sees the public listing, contact link and disclaimer but cannot edit", async ({ page }) => {
    await signup(page, "bob");
    await page.goto("/market");
    await expect(page.getByText(/at your own risk/i).first()).toBeVisible();
    await expect(page.getByText("Test Player")).toBeVisible();
    await expect(page.getByText("Hidden Player")).toHaveCount(0);

    await page.goto(cardUrl);
    const contact = page.getByRole("link", { name: "Contact alice" });
    await expect(contact).toHaveAttribute("href", "mailto:alice@example.com");
    await expect(page.getByRole("heading", { name: "Edit card" })).toHaveCount(0);

    const cardId = cardUrl.split("/").pop();
    const patch = await page.request.patch(`/api/cards/${cardId}`, { data: { player: "Hacked" } });
    expect(patch.status()).toBe(404);
    const del = await page.request.delete(`/api/cards/${cardId}`);
    expect(del.status()).toBe(404);

    // Cross-site writes are rejected even with a valid session.
    const cross = await page.request.patch(`/api/cards/${cardId}`, {
      data: { player: "x" },
      headers: { origin: "https://evil.example" },
    });
    expect(cross.status()).toBe(403);

    await page.goto("/u/alice");
    await expect(page.getByText("Collecting baseball rookies.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Contact alice" })).toBeVisible();
    await expect(page.getByText("Vault")).toHaveCount(0);
  });

  test("owner can edit and delete a card; bad logins are rejected", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("alice@example.com");
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page.locator("p.error")).toContainText("Incorrect email or password");

    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/scan$/);

    await page.goto(cardUrl);
    await page.getByLabel("Grade (if slabbed)").fill("PSA 9");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Saved")).toBeVisible();
    await page.reload();
    await expect(page.getByText("PSA 9").first()).toBeVisible();

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Delete card" }).click();
    await expect(page).toHaveURL(/\/collections\/\d+$/);
    expect((await page.goto(cardUrl))?.status()).toBe(404);

    await page.goto("/");
    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page.getByRole("link", { name: "Log in" })).toBeVisible();
  });
});

test("rejects non-image uploads", async ({ page }) => {
  await signup(page, "carol");
  const response = await page.request.post("/api/scan", {
    multipart: { front: { name: "x.png", mimeType: "image/png", buffer: Buffer.from("<html>not an image</html>") } },
  });
  expect(response.status()).toBe(400);
  expect((await response.json()).error).toMatch(/JPEG, PNG, WebP or GIF/);
});

test("mobile layout has no horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 740 });
  await signup(page, "dana");
  for (const url of ["/scan", "/collections", "/market", "/settings", "/terms", "/"]) {
    await page.goto(url);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `${url} overflows`).toBeLessThanOrEqual(0);
  }
});
