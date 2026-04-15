import { expect, test } from "@playwright/test";

/**
 * E2e tests for the Event Explorer page (/explore).
 *
 * AC #2: seed data, open Explorer, filter by event name, verify results.
 *
 * Pre-conditions: Next.js dev server + ClickHouse running.
 */

test.describe("Event Explorer page (/explore)", () => {
  test.beforeAll(async ({ request }) => {
    // Seed sample data; the endpoint clears existing data then inserts ~12k events
    const res = await request.post("/api/seed", { timeout: 60000 });
    expect(res.ok()).toBeTruthy();
  });

  test("page heading shows 'Event Explorer'", async ({ page }) => {
    await page.goto("/explore");
    await expect(
      page.getByRole("heading", { name: /event explorer/i }),
    ).toBeVisible();
  });

  test("event table is visible after seeding", async ({ page }) => {
    await page.goto("/explore");
    await expect(page.getByTestId("event-table")).toBeVisible();
  });

  test("event table has data rows after seeding", async ({ page }) => {
    await page.goto("/explore");
    const table = page.getByTestId("event-table");
    // Wait for at least one row beyond the header
    await expect(table.getByRole("row").nth(1)).toBeVisible({
      timeout: 10000,
    });
  });

  test("filtering by 'Purchase Completed' shows only matching events (AC #2)", async ({
    page,
  }) => {
    await page.goto("/explore");

    // Wait for initial data rows to appear before filtering
    const table = page.getByTestId("event-table");
    await expect(table.getByRole("row").nth(1)).toBeVisible({
      timeout: 10000,
    });

    // Use the event name filter autocomplete
    const filterInput = page.getByLabel("Filter by event name");
    await filterInput.click();
    await filterInput.fill("Purchase Completed");
    await page.getByRole("option", { name: "Purchase Completed" }).click();

    // At least one "Purchase Completed" cell must appear
    await expect(
      table.getByRole("cell", { name: "Purchase Completed" }).first(),
    ).toBeVisible({ timeout: 10000 });

    // "Page Viewed" is the most common event (~40% of seed data); after filtering
    // it should no longer appear in the table
    await expect(
      table.getByRole("cell", { name: "Page Viewed" }),
    ).not.toBeVisible();
  });
});
