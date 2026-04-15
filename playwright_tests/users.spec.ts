import { expect, test } from "@playwright/test";

/**
 * Integration tests for the F25 Users search page.
 *
 * Pre-conditions: Next.js dev or production server running at BASE_URL
 * (default http://localhost:3000). Override with BASE_URL env variable.
 */

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

test.describe("Users page (/users)", () => {
  test("page renders with search input (data-testid=users-search)", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/users`);
    const searchInput = page.getByTestId("users-search");
    await expect(searchInput).toBeVisible();
  });

  test("page renders with results table (data-testid=users-table)", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/users`);
    const table = page.getByTestId("users-table");
    await expect(table).toBeVisible();
  });

  test("page heading shows 'Users'", async ({ page }) => {
    await page.goto(`${BASE_URL}/users`);
    const heading = page.getByRole("heading", { name: "Users" });
    await expect(heading).toBeVisible();
  });
});
