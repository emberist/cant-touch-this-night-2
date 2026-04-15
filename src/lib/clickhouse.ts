import { createClient } from "@clickhouse/client";

export const clickhouse = createClient({
  url: process.env.CLICKHOUSE_URL ?? "http://localhost:8123",
  database: process.env.CLICKHOUSE_DB ?? "minipanel",
  password: process.env.CLICKHOUSE_PASSWORD ?? "password",
});
