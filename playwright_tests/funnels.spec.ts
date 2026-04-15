import { expect, test } from "@playwright/test";

/**
 * Integration tests for the F24 Funnels page.
 *
 * Pre-conditions: Next.js dev or production server running at BASE_URL
 * (default http://localhost:3000). Override with BASE_URL env variable.
 */

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

test.describe("Funnels page (/funnels)", () => {
  test("page heading shows 'Funnels'", async ({ page }) => {
    await page.goto(`${BASE_URL}/funnels`);
    const heading = page.getByRole("heading", { name: "Funnels" });
    await expect(heading).toBeVisible();
  });

  test("step-builder container is visible", async ({ page }) => {
    await page.goto(`${BASE_URL}/funnels`);
    const stepBuilder = page.getByTestId("step-builder");
    await expect(stepBuilder).toBeVisible();
  });

  test("funnel-date-range container is visible", async ({ page }) => {
    await page.goto(`${BASE_URL}/funnels`);
    const dateRange = page.getByTestId("funnel-date-range");
    await expect(dateRange).toBeVisible();
  });

  test("funnel-chart container is visible", async ({ page }) => {
    await page.goto(`${BASE_URL}/funnels`);
    const chart = page.getByTestId("funnel-chart");
    await expect(chart).toBeVisible();
  });

  test("step-builder renders exactly 2 comboboxes by default", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/funnels`);
    const stepBuilder = page.getByTestId("step-builder");
    const combos = stepBuilder.getByRole("combobox");
    await expect(combos).toHaveCount(2);
  });

  test("Add Step button is visible and not disabled", async ({ page }) => {
    await page.goto(`${BASE_URL}/funnels`);
    const addBtn = page.getByRole("button", { name: /add step/i });
    await expect(addBtn).toBeVisible();
    await expect(addBtn).toBeEnabled();
  });

  test("clicking Add Step adds a third combobox", async ({ page }) => {
    await page.goto(`${BASE_URL}/funnels`);
    const addBtn = page.getByRole("button", { name: /add step/i });
    await addBtn.click();
    const stepBuilder = page.getByTestId("step-builder");
    const combos = stepBuilder.getByRole("combobox");
    await expect(combos).toHaveCount(3);
  });

  test("Run Funnel button is visible", async ({ page }) => {
    await page.goto(`${BASE_URL}/funnels`);
    const runBtn = page.getByRole("button", { name: /run funnel/i });
    await expect(runBtn).toBeVisible();
  });
});
