import { expect, test } from "@playwright/test";

/**
 * E2e tests for the Testing page (/test).
 *
 * AC #1: fire a quick-fire event via Testing page, verify it appears in Live
 * Feed within ~5 seconds (SSE polls every 1s + render latency).
 *
 * Pre-conditions: Next.js dev server running at baseURL (playwright.config.ts).
 */

test.describe("Testing page (/test)", () => {
  test("page heading shows 'Test'", async ({ page }) => {
    await page.goto("/test");
    await expect(page.getByRole("heading", { name: "Test" })).toBeVisible();
  });

  test("quick-fire-buttons panel is visible", async ({ page }) => {
    await page.goto("/test");
    await expect(page.getByTestId("quick-fire-buttons")).toBeVisible();
  });

  test("Live Feed heading is visible", async ({ page }) => {
    await page.goto("/test");
    await expect(
      page.getByRole("heading", { name: "Live Feed" }),
    ).toBeVisible();
  });

  test("clicking 'Anonymous Page View' sends event and shows Sent feedback", async ({
    page,
  }) => {
    await page.goto("/test");
    await page.getByRole("button", { name: "Anonymous Page View" }).click();
    // Feedback caption "Sent" appears below the button on success
    await expect(page.getByText("Sent").first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("after firing an event, event-card appears in Live Feed (AC #1)", async ({
    page,
  }) => {
    await page.goto("/test");

    // Fire an event
    await page.getByRole("button", { name: "Anonymous Page View" }).click();
    // Wait for the POST to succeed
    await expect(page.getByText("Sent").first()).toBeVisible({
      timeout: 10000,
    });

    // SSE polls every 1s; allow up to 8s for the card to appear in the feed
    await expect(page.getByTestId("event-card").first()).toBeVisible({
      timeout: 8000,
    });
  });

  test("clicking 'Signup' button sends event and shows Sent feedback", async ({
    page,
  }) => {
    await page.goto("/test");
    await page.getByRole("button", { name: "Signup" }).click();
    await expect(page.getByText("Sent").first()).toBeVisible({
      timeout: 10000,
    });
  });
});
