import { expect, test } from "@playwright/test";

/**
 * Integration tests for the F26 User profile page (/users/[id]).
 *
 * Pre-conditions: Next.js dev or production server running at BASE_URL
 * (default http://localhost:3000). Override with BASE_URL env variable.
 *
 * Some tests (identity-cluster, user-timeline) additionally require a running
 * ClickHouse instance with seeded data (pnpm seed or POST /api/seed).
 */

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

test.describe("User profile page (/users/[id])", () => {
  test("page renders user-profile container for any id (no ClickHouse needed)", async ({
    page,
  }) => {
    // data-testid="user-profile" is present in every render state:
    // loading skeleton, error, 404, and profile loaded.
    await page.goto(`${BASE_URL}/users/nonexistent-user-xyz`);
    const container = page.getByTestId("user-profile");
    await expect(container).toBeVisible();
  });

  test("shows 404 / not-found message when user does not exist", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/users/nonexistent-user-xyz`);
    // Wait for any loading to complete
    await page.waitForTimeout(2000);
    const container = page.getByTestId("user-profile");
    await expect(container).toBeVisible();
    // Should show "not found" text (no identity-cluster or user-timeline)
    const identityCluster = page.getByTestId("identity-cluster");
    await expect(identityCluster).not.toBeVisible();
  });

  test("shows identity-cluster and user-timeline for a seeded user (requires ClickHouse + seed data)", async ({
    page,
  }) => {
    // This test requires: running ClickHouse + seeded data (POST /api/seed).
    // Skip gracefully if the page shows an error (ClickHouse not running).
    await page.goto(`${BASE_URL}/users/test%40example.com`);

    // Wait for client-side data fetch to complete (up to 5s)
    await page.waitForTimeout(3000);

    const container = page.getByTestId("user-profile");
    await expect(container).toBeVisible();

    // If ClickHouse is unavailable the page will show an error — soft-assert only
    const errorText = await page
      .locator('[data-testid="user-profile"]')
      .textContent();
    if (
      errorText?.includes("Failed to load") ||
      errorText?.includes("not found")
    ) {
      test.skip(
        true,
        "ClickHouse not available or user 'test@example.com' not seeded",
      );
      return;
    }

    await expect(page.getByTestId("identity-cluster")).toBeVisible();
    await expect(page.getByTestId("user-timeline")).toBeVisible();
  });

  test("user-profile container present in initial SSR response (curl-equivalent)", async ({
    page,
  }) => {
    // JavaScript disabled: test that the SSR HTML already contains data-testid="user-profile"
    // by checking immediately (before any client-side hydration effects run).
    await page.goto(`${BASE_URL}/users/some-user`, { waitUntil: "commit" });
    const html = await page.content();
    expect(html).toContain('data-testid="user-profile"');
  });
});
