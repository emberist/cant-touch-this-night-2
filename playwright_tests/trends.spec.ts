import { expect, test } from "@playwright/test";

/**
 * Integration tests for the F22 Trends page.
 *
 * Pre-conditions: Next.js dev or production server running at BASE_URL
 * (default http://localhost:3000). Override with BASE_URL env variable.
 */

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

test.describe("Trends page (/trends)", () => {
  test("page title contains 'Trends'", async ({ page }) => {
    await page.goto(`${BASE_URL}/trends`);
    await expect(page).toHaveTitle(/Trends/i);
  });

  test("controls container is visible", async ({ page }) => {
    await page.goto(`${BASE_URL}/trends`);
    const controls = page.getByTestId("trends-controls");
    await expect(controls).toBeVisible();
  });

  test("chart container is visible", async ({ page }) => {
    await page.goto(`${BASE_URL}/trends`);
    const chart = page.getByTestId("trend-chart");
    await expect(chart).toBeVisible();
  });

  test("page heading shows 'Trends'", async ({ page }) => {
    await page.goto(`${BASE_URL}/trends`);
    const heading = page.getByRole("heading", { name: "Trends" });
    await expect(heading).toBeVisible();
  });
});
