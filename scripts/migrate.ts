import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_HOST = "localhost";
const DEFAULT_NATIVE_PORT = "9000";
const DEFAULT_PASSWORD = "";

export function runMigration(): void {
  const host = process.env.CLICKHOUSE_HOST ?? DEFAULT_HOST;
  const port = process.env.CLICKHOUSE_NATIVE_PORT ?? DEFAULT_NATIVE_PORT;
  const password = process.env.CLICKHOUSE_PASSWORD ?? DEFAULT_PASSWORD;

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const schemaFile = path.resolve(scriptDir, "schema.sql");
  const sql = readFileSync(schemaFile, "utf-8");

  const args = ["client", `--host=${host}`, `--port=${port}`];
  if (password) args.push(`--password=${password}`);

  const result = spawnSync("./clickhouse", args, {
    input: sql,
    stdio: ["pipe", "inherit", "inherit"],
  });

  if (result.status !== 0) {
    throw new Error(`clickhouse client exited with code ${result.status}`);
  }

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
