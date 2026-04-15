import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// vi.mock is hoisted before imports — child_process is mocked for every import of migrate.ts
const mockExecFileSync = vi.fn();

vi.mock("node:child_process", () => ({
  execFileSync: mockExecFileSync,
}));

describe("runMigration", () => {
  let runMigration: () => void;

  beforeEach(async () => {
    vi.resetModules();
    mockExecFileSync.mockReset();
    const mod = await import("../migrate");
    runMigration = mod.runMigration;
  });

  afterEach(() => {
    delete process.env.CLICKHOUSE_URL;
    delete process.env.CLICKHOUSE_PASSWORD;
  });

  it("calls ./clickhouse with client subcommand and --queries-file pointing to schema.sql", () => {
    delete process.env.CLICKHOUSE_URL;
    delete process.env.CLICKHOUSE_PASSWORD;

    runMigration();

    expect(mockExecFileSync).toHaveBeenCalledOnce();
    const [binary, args] = mockExecFileSync.mock.calls[0] as [string, string[]];
    expect(binary).toBe("./clickhouse");
    expect(args[0]).toBe("client");
    const queriesFileArg = args.find((a) => a.startsWith("--queries-file="));
    expect(queriesFileArg).toBeDefined();
    expect(queriesFileArg).toMatch(/schema\.sql$/);
  });

  it("uses default host (localhost), port (8123), and password (password) when env vars are absent", () => {
    delete process.env.CLICKHOUSE_URL;
    delete process.env.CLICKHOUSE_PASSWORD;

    runMigration();

    const [, args] = mockExecFileSync.mock.calls[0] as [string, string[]];
    expect(args).toContain("--host=localhost");
    expect(args).toContain("--port=8123");
    expect(args).toContain("--password=password");
  });

  it("parses custom CLICKHOUSE_URL into correct --host and --port flags", () => {
    process.env.CLICKHOUSE_URL = "http://custom-host:9000";
    delete process.env.CLICKHOUSE_PASSWORD;

    runMigration();

    const [, args] = mockExecFileSync.mock.calls[0] as [string, string[]];
    expect(args).toContain("--host=custom-host");
    expect(args).toContain("--port=9000");
  });

  it("uses custom CLICKHOUSE_PASSWORD from env var", () => {
    delete process.env.CLICKHOUSE_URL;
    process.env.CLICKHOUSE_PASSWORD = "supersecret";

    runMigration();

    const [, args] = mockExecFileSync.mock.calls[0] as [string, string[]];
    expect(args).toContain("--password=supersecret");
  });

  it("throws when execFileSync exits with non-zero (child process failure)", () => {
    delete process.env.CLICKHOUSE_URL;
    delete process.env.CLICKHOUSE_PASSWORD;
    mockExecFileSync.mockImplementation(() => {
      throw new Error("Command failed: ./clickhouse client");
    });

    expect(() => runMigration()).toThrow("Command failed");
  });

  it("logs a success message after a successful migration", () => {
    delete process.env.CLICKHOUSE_URL;
    delete process.env.CLICKHOUSE_PASSWORD;
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    runMigration();

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("success"));
    consoleSpy.mockRestore();
  });
});
