import { expect, test } from "@playwright/test";

/**
 * E2e tests for F31 Bulk Generator page at /generate.
 *
 * Pre-conditions: Next.js server running at BASE_URL
 * (default http://localhost:3000). Override with BASE_URL env variable.
 *
 * Covers the "integration gap" HTTP checks from F31-plan.md:
 *   - GET /generate contains "Generate"
 *   - GET /generate contains "Realistic"
 *   - GET /generate contains "Total events"
 */

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

test.describe("Generate page (/generate)", () => {
  test("page renders with 'Generate' heading", async ({ page }) => {
    await page.goto(`${BASE_URL}/generate`);
    await expect(page.getByRole("heading", { name: /generate/i })).toBeVisible();
  });

  test("'Realistic' preset button is visible", async ({ page }) => {
    await page.goto(`${BASE_URL}/generate`);
    await expect(page.getByText(/realistic/i)).toBeVisible();
  });

  test("'Total events' field label is visible", async ({ page }) => {
    await page.goto(`${BASE_URL}/generate`);
    await expect(page.getByText(/total events/i)).toBeVisible();
  });

  test("preset buttons for all three templates are present", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/generate`);
    await expect(page.getByText(/realistic/i)).toBeVisible();
    await expect(page.getByText(/high.?volume/i)).toBeVisible();
    await expect(page.getByText(/stress.?test/i)).toBeVisible();
  });

  test("Generate submit button is present and enabled", async ({ page }) => {
    await page.goto(`${BASE_URL}/generate`);
    const btn = page.getByRole("button", { name: /^generate$/i });
    await expect(btn).toBeVisible();
    await expect(btn).toBeEnabled();
  });

  test("progress panel is hidden on initial load", async ({ page }) => {
    await page.goto(`${BASE_URL}/generate`);
    await expect(page.getByTestId("progress-panel")).not.toBeVisible();
  });
});
