import { afterEach, describe, expect, it, vi } from "vitest";

const mockClient = {
  query: vi.fn(),
  insert: vi.fn(),
  command: vi.fn(),
  exec: vi.fn(),
  ping: vi.fn(),
  close: vi.fn(),
};

const mockCreateClient = vi.fn(() => mockClient);

vi.mock("@clickhouse/client", () => ({
  createClient: mockCreateClient,
}));

describe("clickhouse singleton", () => {
  afterEach(() => {
    vi.resetModules();
    mockCreateClient.mockClear();
  });

  it("exports a defined clickhouse client", async () => {
    const { clickhouse } = await import("@/lib/clickhouse");
    expect(clickhouse).toBeDefined();
    expect(clickhouse).not.toBeNull();
  });

  it("client has a query method", async () => {
    const { clickhouse } = await import("@/lib/clickhouse");
    expect(typeof clickhouse.query).toBe("function");
  });

  it("is a singleton — same instance on multiple imports within the same module load", async () => {
    const { clickhouse: a } = await import("@/lib/clickhouse");
    const { clickhouse: b } = await import("@/lib/clickhouse");
    expect(a).toBe(b);
    expect(mockCreateClient).toHaveBeenCalledTimes(1);
  });

  it("uses default values when env vars are absent", async () => {
    const savedURL = process.env.CLICKHOUSE_URL;
    const savedDB = process.env.CLICKHOUSE_DB;
    const savedPW = process.env.CLICKHOUSE_PASSWORD;
    delete process.env.CLICKHOUSE_URL;
    delete process.env.CLICKHOUSE_DB;
    delete process.env.CLICKHOUSE_PASSWORD;

    await import("@/lib/clickhouse");

    expect(mockCreateClient).toHaveBeenCalledWith({
      url: "http://localhost:8123",
      database: "minipanel",
      password: "password",
    });

    if (savedURL !== undefined) process.env.CLICKHOUSE_URL = savedURL;
    if (savedDB !== undefined) process.env.CLICKHOUSE_DB = savedDB;
    if (savedPW !== undefined) process.env.CLICKHOUSE_PASSWORD = savedPW;
  });

  it("reads custom values from env vars", async () => {
    process.env.CLICKHOUSE_URL = "http://custom-host:9000";
    process.env.CLICKHOUSE_DB = "custom_db";
    process.env.CLICKHOUSE_PASSWORD = "secret";

    await import("@/lib/clickhouse");

    expect(mockCreateClient).toHaveBeenCalledWith({
      url: "http://custom-host:9000",
      database: "custom_db",
      password: "secret",
    });

    delete process.env.CLICKHOUSE_URL;
    delete process.env.CLICKHOUSE_DB;
    delete process.env.CLICKHOUSE_PASSWORD;
  });
});
