import { expect, test } from "@playwright/test";

/**
 * Integration tests for the Funnels page (/funnels).
 *
 * Structural tests run without seeded data.
 * Data-driven tests (AC #4) require ClickHouse + seed data.
 *
 * Pre-conditions: Next.js dev server running at baseURL (playwright.config.ts).
 */

test.describe("Funnels page (/funnels)", () => {
  test("page heading shows 'Funnels'", async ({ page }) => {
    await page.goto("/funnels");
    await expect(page.getByRole("heading", { name: "Funnels" })).toBeVisible();
  });

  test("step-builder container is visible", async ({ page }) => {
    await page.goto("/funnels");
    await expect(page.getByTestId("step-builder")).toBeVisible();
  });

  test("funnel-date-range container is visible", async ({ page }) => {
    await page.goto("/funnels");
    await expect(page.getByTestId("funnel-date-range")).toBeVisible();
  });

  test("funnel-chart container is visible", async ({ page }) => {
    await page.goto("/funnels");
    await expect(page.getByTestId("funnel-chart")).toBeVisible();
  });

  test("step-builder renders exactly 2 comboboxes by default", async ({
    page,
  }) => {
    await page.goto("/funnels");
    const combos = page.getByTestId("step-builder").getByRole("combobox");
    await expect(combos).toHaveCount(2);
  });

  test("Add Step button is visible and not disabled", async ({ page }) => {
    await page.goto("/funnels");
    const addBtn = page.getByRole("button", { name: /add step/i });
    await expect(addBtn).toBeVisible();
    await expect(addBtn).toBeEnabled();
  });

  test("clicking Add Step adds a third combobox", async ({ page }) => {
    await page.goto("/funnels");
    await page.getByRole("button", { name: /add step/i }).click();
    const combos = page.getByTestId("step-builder").getByRole("combobox");
    await expect(combos).toHaveCount(3);
  });

  test("Run Funnel button is visible", async ({ page }) => {
    await page.goto("/funnels");
    await expect(
      page.getByRole("button", { name: /run funnel/i }),
    ).toBeVisible();
  });
});

test.describe("Funnels page — data-driven (requires ClickHouse + seed data)", () => {
  test.beforeAll(async ({ request }) => {
    const res = await request.post("/api/seed", { timeout: 60000 });
    expect(res.ok()).toBeTruthy();
  });

  test("3-step funnel shows chart with non-zero conversion rates (AC #4)", async ({
    page,
  }) => {
    await page.goto("/funnels");

    const stepBuilder = page.getByTestId("step-builder");

    // Step 1: Page Viewed
    const step1 = stepBuilder.getByRole("combobox").nth(0);
    await step1.click();
    await step1.fill("Page Viewed");
    await page.getByRole("option", { name: "Page Viewed" }).click();

    // Step 2: Signup Completed
    const step2 = stepBuilder.getByRole("combobox").nth(1);
    await step2.click();
    await step2.fill("Signup Completed");
    await page.getByRole("option", { name: "Signup Completed" }).click();

    // Add a third step
    await page.getByRole("button", { name: /add step/i }).click();

    // Step 3: Purchase Completed
    const step3 = stepBuilder.getByRole("combobox").nth(2);
    await step3.click();
    await step3.fill("Purchase Completed");
    await page.getByRole("option", { name: "Purchase Completed" }).click();

    // Run the funnel
    await page.getByRole("button", { name: /run funnel/i }).click();

    // funnel-chart-steps renders when there are results with at least one step
    await expect(page.getByTestId("funnel-chart-steps")).toBeVisible({
      timeout: 15000,
    });

    // Drop-off annotations are rendered between steps (non-zero conversion means
    // at least one drop-off element is present)
    await expect(page.getByTestId("funnel-dropoff").first()).toBeVisible();
  });
});
