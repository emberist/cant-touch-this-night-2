import { expect, test } from "@playwright/test";

/**
 * E2e tests for identity resolution flows.
 *
 * AC #5: identity.spec.ts exists and tests the anonymous → identify flow.
 * AC #6 (BR-101 Scenario 1): 4 anonymous events + 1 identify → user profile
 *   shows all 5 events under the resolved user identity.
 * AC #7 (BR-101 Scenario 2): two devices linked to same user → both device
 *   IDs appear in the user's identity cluster.
 *
 * Pre-conditions: Next.js dev server + ClickHouse running.
 *
 * Notes on device IDs:
 *   The Testing page's "Anonymous Page View" button generates a NEW random
 *   device_id on each click. Only the LAST device_id is stored as lastDeviceId
 *   and used by "Identify User". Therefore, the BR-101 Scenario 1 flow (4×
 *   anon + identify → 5 events) is exercised via the API directly to control
 *   which device_id is used. A separate UI smoke-test verifies the button flow.
 */

test.describe("Identity resolution — API-level verification", () => {
  test("AC #5/#6 — 4 anonymous events + identify → user profile shows 5 events", async ({
    page,
    request,
  }) => {
    const deviceId = `pw-anon-${Date.now()}`;
    const userId = `pw-user-${Date.now()}@example.com`;

    // Insert 4 anonymous Page Viewed events for the same device
    for (let i = 0; i < 4; i++) {
      const res = await request.post("/api/events", {
        data: {
          event_name: "Page Viewed",
          device_id: deviceId,
          properties: { page: `/page${i}` },
        },
      });
      expect(res.status()).toBe(201);
    }

    // Insert the identity-link event (device_id + user_id → creates mapping)
    const identifyRes = await request.post("/api/events", {
      data: {
        event_name: "Identify",
        device_id: deviceId,
        user_id: userId,
      },
    });
    expect(identifyRes.status()).toBe(201);

    // Navigate to the user profile (Server Component; queries ClickHouse at
    // request time, so the mapping is immediately visible via FINAL)
    await page.goto(`/users/${encodeURIComponent(userId)}`);

    // Profile container must be present
    await expect(page.getByTestId("user-profile")).toBeVisible();

    // Identity cluster should list userId as a user ID chip
    const cluster = page.getByTestId("identity-cluster");
    await expect(cluster).toBeVisible();
    await expect(cluster.getByText(userId)).toBeVisible({ timeout: 10000 });

    // The deviceId should also appear in the cluster (mapped device)
    await expect(cluster.getByText(deviceId)).toBeVisible();

    // Event Timeline heading shows the count: "Event Timeline (5 events)"
    await expect(page.getByText(/event timeline \(5 events\)/i)).toBeVisible();
  });

  test("AC #7 (BR-101 Scenario 2) — two devices linked to same user appear in identity cluster", async ({
    page,
    request,
  }) => {
    const ts = Date.now();
    const deviceA = `pw-device-a-${ts}`;
    const deviceB = `pw-device-b-${ts + 1}`;
    const userId = `pw-two-devices-${ts}@example.com`;

    // Link device-A to userId
    const resA = await request.post("/api/events", {
      data: {
        event_name: "Page Viewed",
        device_id: deviceA,
        user_id: userId,
        properties: { page: "/from-device-a" },
      },
    });
    expect(resA.status()).toBe(201);

    // Link device-B to the same userId (one user → many devices is valid)
    const resB = await request.post("/api/events", {
      data: {
        event_name: "Page Viewed",
        device_id: deviceB,
        user_id: userId,
        properties: { page: "/from-device-b" },
      },
    });
    expect(resB.status()).toBe(201);

    // Navigate to the user profile
    await page.goto(`/users/${encodeURIComponent(userId)}`);

    const cluster = page.getByTestId("identity-cluster");
    await expect(cluster).toBeVisible({ timeout: 10000 });

    // Both device IDs should appear as chips in the identity cluster
    await expect(cluster.getByText(deviceA)).toBeVisible();
    await expect(cluster.getByText(deviceB)).toBeVisible();
  });
});

test.describe("Identity resolution — UI smoke-test (Testing page)", () => {
  test("AC #5 — Anonymous Page View then Identify User buttons work end-to-end", async ({
    page,
  }) => {
    await page.goto("/test");
    await expect(page.getByTestId("quick-fire-buttons")).toBeVisible();

    // Fire one anonymous page view to establish lastDeviceId in the hook
    await page.getByRole("button", { name: "Anonymous Page View" }).click();
    await expect(page.getByText("Sent").first()).toBeVisible({
      timeout: 10000,
    });

    // Link that device to test@example.com
    await page.getByRole("button", { name: "Identify User" }).click();
    await expect(page.getByText("Sent").first()).toBeVisible({
      timeout: 10000,
    });

    // Navigate to the user profile — it should exist with identity cluster visible
    await page.goto("/users/test%40example.com");

    await expect(page.getByTestId("user-profile")).toBeVisible();

    const cluster = page.getByTestId("identity-cluster");
    await expect(cluster).toBeVisible();
    await expect(cluster.getByText("test@example.com")).toBeVisible({
      timeout: 10000,
    });
  });
});
