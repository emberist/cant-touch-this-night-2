import { expect, test } from "@playwright/test";

/**
 * Integration tests for the Trends page (/trends).
 *
 * Structural tests run without seeded data.
 * Data-driven tests (AC #3) require ClickHouse + seed data.
 *
 * Pre-conditions: Next.js dev server running at baseURL (playwright.config.ts).
 */

test.describe("Trends page (/trends)", () => {
  test("page title contains 'Trends'", async ({ page }) => {
    await page.goto("/trends");
    await expect(page).toHaveTitle(/Trends/i);
  });

  test("controls container is visible", async ({ page }) => {
    await page.goto("/trends");
    await expect(page.getByTestId("trends-controls")).toBeVisible();
  });

  test("chart container is visible", async ({ page }) => {
    await page.goto("/trends");
    await expect(page.getByTestId("trend-chart")).toBeVisible();
  });

  test("page heading shows 'Trends'", async ({ page }) => {
    await page.goto("/trends");
    await expect(page.getByRole("heading", { name: "Trends" })).toBeVisible();
  });
});

test.describe("Trends page — data-driven (requires ClickHouse + seed data)", () => {
  test.beforeAll(async ({ request }) => {
    const res = await request.post("/api/seed", { timeout: 60000 });
    expect(res.ok()).toBeTruthy();
  });

  test("selecting 'Page Viewed' event renders chart with data (AC #3)", async ({
    page,
  }) => {
    await page.goto("/trends");

    // Wait for the schema to load so the autocomplete has options
    await expect(page.getByTestId("trends-controls")).toBeVisible();

    // Select "Page Viewed" from the event-name autocomplete
    const eventInput = page.getByLabel("Event name");
    await eventInput.click();
    await eventInput.fill("Page Viewed");
    await page.getByRole("option", { name: "Page Viewed" }).click();

    // useTrends fires a fetch as soon as eventName is set.
    // Wait for the skeleton (loading indicator) to disappear.
    await expect(page.getByTestId("trend-chart-skeleton")).not.toBeVisible({
      timeout: 15000,
    });

    // Chart should now show real data, not the empty-state placeholder
    await expect(page.getByTestId("trend-chart-empty")).not.toBeVisible();
  });
});
