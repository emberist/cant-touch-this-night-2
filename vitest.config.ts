import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { defaultExclude, defineConfig } from "vitest/config";

/**
 * Parse a .env file and return key/value pairs.
 * Skips blank lines and comments. Keys already present in process.env are
 * excluded so that explicit environment variables always take precedence.
 */
function loadEnvFile(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) return {};
  const result: Record<string, string> = {};
  for (const line of readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (key in process.env) continue; // explicit env wins
    result[key] = trimmed.slice(eq + 1);
  }
  return result;
}

export default defineConfig({
  test: {
    environment: "node",
    exclude: [...defaultExclude, "playwright_tests/**/*.spec.ts"],
    env: loadEnvFile(path.resolve(".env.local")),
    // Integration tests share the minipanel_test ClickHouse database; running
    // files in parallel causes afterEach truncates in one file to destroy data
    // mid-test in another file. Sequential execution avoids this interference.
    fileParallelism: false,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
