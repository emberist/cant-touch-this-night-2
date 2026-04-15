import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_URL = "http://localhost:8123";
const DEFAULT_PASSWORD = "password";

function parseClickhouseUrl(urlStr: string): { host: string; port: string } {
  const parsed = new URL(urlStr);
  return {
    host: parsed.hostname,
    port: parsed.port || "8123",
  };
}

export function runMigration(): void {
  const urlStr = process.env.CLICKHOUSE_URL ?? DEFAULT_URL;
  const password = process.env.CLICKHOUSE_PASSWORD ?? DEFAULT_PASSWORD;
  const { host, port } = parseClickhouseUrl(urlStr);

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const schemaFile = path.resolve(scriptDir, "schema.sql");

  execFileSync(
    "./clickhouse",
    [
      "client",
      `--host=${host}`,
      `--port=${port}`,
      `--password=${password}`,
      `--queries-file=${schemaFile}`,
    ],
    { stdio: "inherit" },
  );

  console.log("Migration completed successfully.");
}

// Run only when this file is the entry point (not when imported as a module)
const isDirectRun =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) ===
    path.resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  try {
    runMigration();
  } catch (err) {
    console.error("Migration failed:", String(err));
    process.exit(1);
  }
}
