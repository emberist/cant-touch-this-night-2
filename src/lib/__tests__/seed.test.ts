import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

// ─── Mock setup ────────────────────────────────────────────────────────────────

const { mockCommand, mockInsert } = vi.hoisted(() => ({
  mockCommand: vi.fn(),
  mockInsert: vi.fn(),
}));

vi.mock("@/lib/clickhouse", () => ({
  clickhouse: {
    command: mockCommand,
    insert: mockInsert,
  },
}));

import {
  buildIdentityMappings,
  generateEvents,
  generateUsers,
  seedData,
} from "@/lib/seed";

// ─── Fixed date range for deterministic tests ─────────────────────────────────

const END_DATE = new Date("2026-04-15T00:00:00.000Z");
const START_DATE = new Date(END_DATE.getTime() - 30 * 24 * 60 * 60 * 1000);

// ─── Global mock reset ────────────────────────────────────────────────────────

beforeEach(() => {
  mockCommand.mockResolvedValue(undefined);
  mockInsert.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.clearAllMocks();
});

// ─── generateUsers ────────────────────────────────────────────────────────────

describe("generateUsers", () => {
  it("generates exactly 70 users in total", () => {
    const users = generateUsers();
    expect(users).toHaveLength(70);
  });

  it("generates exactly 50 fully-resolved users", () => {
    const users = generateUsers();
    const fullyResolved = users.filter((u) => u.type === "fully-resolved");
    expect(fullyResolved).toHaveLength(50);
  });

  it("generates exactly 10 multi-device users", () => {
    const users = generateUsers();
    const multiDevice = users.filter((u) => u.type === "multi-device");
    expect(multiDevice).toHaveLength(10);
  });

  it("generates exactly 10 anonymous-only users", () => {
    const users = generateUsers();
    const anonymous = users.filter((u) => u.type === "anonymous");
    expect(anonymous).toHaveLength(10);
  });

  it("multi-device users each have 2–3 device IDs", () => {
    const users = generateUsers();
    const multiDevice = users.filter((u) => u.type === "multi-device");
    for (const user of multiDevice) {
      expect(user.deviceIds.length).toBeGreaterThanOrEqual(2);
      expect(user.deviceIds.length).toBeLessThanOrEqual(3);
    }
  });

  it("anonymous-only users have at least one device_id but no user_id", () => {
    const users = generateUsers();
    const anonymous = users.filter((u) => u.type === "anonymous");
    for (const user of anonymous) {
      expect(user.deviceIds.length).toBeGreaterThanOrEqual(1);
      expect(user.userId).toBeNull();
    }
  });

  it("fully-resolved users have both user_id and device_id", () => {
    const users = generateUsers();
    const fullyResolved = users.filter((u) => u.type === "fully-resolved");
    for (const user of fullyResolved) {
      expect(user.userId).not.toBeNull();
      expect(typeof user.userId).toBe("string");
      expect(user.deviceIds.length).toBe(1);
    }
  });

  it("multi-device users have a user_id", () => {
    const users = generateUsers();
    const multiDevice = users.filter((u) => u.type === "multi-device");
    for (const user of multiDevice) {
      expect(user.userId).not.toBeNull();
      expect(typeof user.userId).toBe("string");
    }
  });
});

// ─── generateEvents ────────────────────────────────────────────────────────────

describe("generateEvents", () => {
  let users: ReturnType<typeof generateUsers>;
  let events: ReturnType<typeof generateEvents>;

  beforeAll(() => {
    users = generateUsers();
    events = generateEvents(users, START_DATE, END_DATE);
  });

  it("generates ~12,000 events (within ±500 of target)", () => {
    expect(events.length).toBeGreaterThanOrEqual(11_500);
    expect(events.length).toBeLessThanOrEqual(12_500);
  });

  it("all 6 event types are present", () => {
    const eventNames = new Set(events.map((e) => e.event_name));
    expect(eventNames).toContain("Page Viewed");
    expect(eventNames).toContain("Button Clicked");
    expect(eventNames).toContain("Signup Completed");
    expect(eventNames).toContain("Purchase Completed");
    expect(eventNames).toContain("Subscription Renewed");
    expect(eventNames).toContain("Support Ticket Opened");
  });

  it("Page Viewed constitutes approximately 40% of events (within ±5%)", () => {
    const pageViewCount = events.filter(
      (e) => e.event_name === "Page Viewed",
    ).length;
    const fraction = pageViewCount / events.length;
    expect(fraction).toBeGreaterThanOrEqual(0.35);
    expect(fraction).toBeLessThanOrEqual(0.45);
  });

  it("all event timestamps are within the supplied date range", () => {
    const startMs = START_DATE.getTime();
    const endMs = END_DATE.getTime();
    for (const event of events) {
      const ts = new Date(event.timestamp).getTime();
      expect(ts).toBeGreaterThanOrEqual(startMs);
      expect(ts).toBeLessThanOrEqual(endMs);
    }
  });

  it("Purchase Completed events have numeric amount in range 0–500", () => {
    const purchases = events.filter(
      (e) => e.event_name === "Purchase Completed",
    );
    expect(purchases.length).toBeGreaterThan(0);
    for (const event of purchases.slice(0, 20)) {
      const props = JSON.parse(event.properties) as Record<string, unknown>;
      expect(typeof props.amount).toBe("number");
      expect(props.amount as number).toBeGreaterThanOrEqual(0);
      expect(props.amount as number).toBeLessThanOrEqual(500);
    }
  });

  it("Support Ticket Opened events have numeric ticket_count property", () => {
    const tickets = events.filter(
      (e) => e.event_name === "Support Ticket Opened",
    );
    expect(tickets.length).toBeGreaterThan(0);
    for (const event of tickets.slice(0, 20)) {
      const props = JSON.parse(event.properties) as Record<string, unknown>;
      expect(typeof props.ticket_count).toBe("number");
    }
  });

  it("Page Viewed events have a page string property", () => {
    const pageViews = events.filter((e) => e.event_name === "Page Viewed");
    expect(pageViews.length).toBeGreaterThan(0);
    for (const event of pageViews.slice(0, 20)) {
      const props = JSON.parse(event.properties) as Record<string, unknown>;
      expect(typeof props.page).toBe("string");
    }
  });

  it("Button Clicked events have a button_name string property", () => {
    const clicks = events.filter((e) => e.event_name === "Button Clicked");
    expect(clicks.length).toBeGreaterThan(0);
    for (const event of clicks.slice(0, 20)) {
      const props = JSON.parse(event.properties) as Record<string, unknown>;
      expect(typeof props.button_name).toBe("string");
    }
  });

  it("Signup Completed events have plan and source string properties", () => {
    const signups = events.filter((e) => e.event_name === "Signup Completed");
    expect(signups.length).toBeGreaterThan(0);
    for (const event of signups.slice(0, 20)) {
      const props = JSON.parse(event.properties) as Record<string, unknown>;
      expect(typeof props.plan).toBe("string");
      expect(typeof props.source).toBe("string");
    }
  });

  it("Purchase Completed events have currency and plan string properties", () => {
    const purchases = events.filter(
      (e) => e.event_name === "Purchase Completed",
    );
    expect(purchases.length).toBeGreaterThan(0);
    for (const event of purchases.slice(0, 20)) {
      const props = JSON.parse(event.properties) as Record<string, unknown>;
      expect(typeof props.currency).toBe("string");
      expect(typeof props.plan).toBe("string");
    }
  });
});

// ─── buildIdentityMappings ────────────────────────────────────────────────────

describe("buildIdentityMappings", () => {
  it("creates exactly 1 mapping per device for fully-resolved users", () => {
    const users = generateUsers();
    const mappings = buildIdentityMappings(users);
    const fullyResolved = users.filter((u) => u.type === "fully-resolved");
    const frMappings = mappings.filter((m) =>
      fullyResolved.some((u) => u.userId === m.user_id),
    );
    expect(frMappings).toHaveLength(50);
  });

  it("creates mappings for each device of multi-device users", () => {
    const users = generateUsers();
    const mappings = buildIdentityMappings(users);
    const multiDevice = users.filter((u) => u.type === "multi-device");
    for (const user of multiDevice) {
      const userMappings = mappings.filter((m) => m.user_id === user.userId);
      expect(userMappings).toHaveLength(user.deviceIds.length);
    }
  });

  it("creates no mappings for anonymous-only users", () => {
    const users = generateUsers();
    const mappings = buildIdentityMappings(users);
    const anonDeviceIds = new Set(
      users.filter((u) => u.type === "anonymous").flatMap((u) => u.deviceIds),
    );
    const anonMappings = mappings.filter((m) => anonDeviceIds.has(m.device_id));
    expect(anonMappings).toHaveLength(0);
  });

  it("total mapping count is in range 70–80 (50 single + 10 × 2-3 multi)", () => {
    const users = generateUsers();
    const mappings = buildIdentityMappings(users);
    expect(mappings.length).toBeGreaterThanOrEqual(70);
    expect(mappings.length).toBeLessThanOrEqual(80);
  });
});

// ─── seedData ─────────────────────────────────────────────────────────────────

describe("seedData", () => {
  it("truncates the events table before inserting", async () => {
    await seedData();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const eventsCall = mockCommand.mock.calls.find((c: any[]) => {
      const q: string = c[0].query;
      return q.toLowerCase().includes("truncate") && q.includes("events");
    });
    expect(eventsCall).toBeDefined();
  });

  it("truncates the identity_mappings table before inserting", async () => {
    await seedData();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mappingsCall = mockCommand.mock.calls.find((c: any[]) => {
      const q: string = c[0].query;
      return (
        q.toLowerCase().includes("truncate") && q.includes("identity_mappings")
      );
    });
    expect(mappingsCall).toBeDefined();
  });

  it("inserts events into the events table with ~12,000 rows", async () => {
    await seedData();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const eventsInsert = mockInsert.mock.calls.find(
      (c: any[]) => c[0].table === "events",
    );
    expect(eventsInsert).toBeDefined();
    // biome-ignore lint/style/noNonNullAssertion: guarded by toBeDefined above
    expect(eventsInsert![0].values.length).toBeGreaterThanOrEqual(11_500);
    // biome-ignore lint/style/noNonNullAssertion: guarded by toBeDefined above
    expect(eventsInsert![0].values.length).toBeLessThanOrEqual(12_500);
  });

  it("inserts identity mappings into the identity_mappings table (70–80 rows)", async () => {
    await seedData();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mappingsInsert = mockInsert.mock.calls.find(
      (c: any[]) => c[0].table === "identity_mappings",
    );
    expect(mappingsInsert).toBeDefined();
    // biome-ignore lint/style/noNonNullAssertion: guarded by toBeDefined above
    expect(mappingsInsert![0].values.length).toBeGreaterThanOrEqual(70);
    // biome-ignore lint/style/noNonNullAssertion: guarded by toBeDefined above
    expect(mappingsInsert![0].values.length).toBeLessThanOrEqual(80);
  });

  it("returns event count and user count for non-anonymous users", async () => {
    const result = await seedData();

    expect(result.events).toBeGreaterThanOrEqual(11_500);
    expect(result.events).toBeLessThanOrEqual(12_500);
    expect(result.users).toBe(60); // 50 fully-resolved + 10 multi-device
  });
});
