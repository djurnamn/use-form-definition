import { test, expect, type Page } from "@playwright/test";

const PATH = "/en/server-action";

async function fillValid(
  page: Page,
  { name = "Playwright User", email = "pw@example.com", rating = "5", feedback = "This is a comfortably long piece of feedback for the e2e test." } = {}
) {
  await page.locator('input[name="name"]').fill(name);
  await page.locator('input[name="email"]').fill(email);
  await page.locator('select[name="rating"]').selectOption(rating);
  await page.locator('textarea[name="feedback"]').fill(feedback);
}

// Without JS the submit is a real browser navigation (the server action runs server-side and
// re-renders the page); wait for that navigation explicitly so we don't race a cold compile.
async function submitAndWaitForNavigation(page: Page) {
  await Promise.all([
    page.waitForNavigation({ timeout: 45_000 }),
    page.getByRole("button", { name: /submit/i }).click(),
  ]);
}

test.describe("server-action form - JavaScript enabled", () => {
  test("client validation gates submit; a valid submit shows the success view in one click", async ({ page }) => {
    await page.goto(PATH);

    // Empty submit: react-hook-form's client validation should block the round-trip.
    await page.getByRole("button", { name: /submit/i }).click();
    await expect(page.getByText("Must be at least 2 characters").first()).toBeVisible();
    await expect(page.getByText(/thank you for your feedback/i)).toHaveCount(0);

    // Fill valid data and submit once.
    await fillValid(page);
    await page.getByRole("button", { name: /submit/i }).click();
    await expect(page.getByText(/thank you for your feedback/i)).toBeVisible();
  });

  test("a selected <select> keeps its value after a server-rejected submit", async ({ page }) => {
    await page.goto(PATH);
    await fillValid(page, { rating: "4", feedback: "too short" }); // feedback fails server-side minLength
    await page.getByRole("button", { name: /submit/i }).click();

    await expect(page.getByText(/must be at least 20 characters/i)).toBeVisible();
    await expect(page.locator('select[name="rating"]')).toHaveValue("4");
  });
});

test.describe("server-action form - JavaScript disabled (progressive enhancement)", () => {
  test.use({ javaScriptEnabled: false });

  test("invalid submit re-renders server-side with errors and repopulated fields", async ({ page }) => {
    await page.goto(PATH);
    // The form opts out of HTML5 validation (noValidate), so even a bad email submits and is
    // caught by the server's own rules.
    await page.locator('input[name="name"]').fill("A"); // too short
    await page.locator('input[name="email"]').fill("not-an-email"); // bad email
    await page.locator('select[name="rating"]').selectOption("5");
    await page.locator('textarea[name="feedback"]').fill("short"); // too short
    await submitAndWaitForNavigation(page);

    await expect(page.getByText("Must be at least 2 characters")).toBeVisible();
    await expect(page.getByText("Invalid format")).toBeVisible();
    await expect(page.getByText("Must be at least 20 characters")).toBeVisible();
    await expect(page.locator('input[name="name"]')).toHaveValue("A");
    await expect(page.locator('input[name="email"]')).toHaveValue("not-an-email");
    await expect(page.locator('select[name="rating"]')).toHaveValue("5");
    // Still the form, not the success view.
    await expect(page.getByText(/thank you for your feedback/i)).toHaveCount(0);
  });

  test("valid submit re-renders server-side with the success view", async ({ page }) => {
    await page.goto(PATH);
    await page.locator('input[name="name"]').fill("Dee");
    await page.locator('input[name="email"]').fill("dee@example.com");
    await page.locator('select[name="rating"]').selectOption("3");
    await page.locator('textarea[name="feedback"]').fill("This feedback is comfortably over twenty characters long.");
    await submitAndWaitForNavigation(page);

    await expect(page.getByText(/thank you for your feedback/i)).toBeVisible();
    await expect(page.getByText(/submitted data/i)).toBeVisible();
  });
});
