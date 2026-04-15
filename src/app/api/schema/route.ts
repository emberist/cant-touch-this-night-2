import { NextResponse } from "next/server";
import { clickhouse } from "@/lib/clickhouse";
import {
  getCachedSchema,
  type SchemaResponse,
  setCachedSchema,
} from "@/lib/schema-cache";

/**
 * GET /api/schema
 *
 * Returns distinct event names and, per event, the detected property names
 * with inferred types ("numeric" | "string").
 *
 * Computed by sampling the last 10,000 events. Cached in memory for 60 s.
 */
export async function GET(_req: Request): Promise<NextResponse> {
  const cached = getCachedSchema();
  if (cached !== null) {
    return NextResponse.json(cached);
  }

  // Single query: sample the last 10,000 events, expand property keys, detect
  // numeric types.  One output row per (event_name, property_key) with
  // is_numeric = 1 if at least one sample value parses as a non-null float.
  //
  // JSONExtractKeys returns an Array(String); arrayJoin flattens it into rows.
  // JSONExtractFloat on a non-numeric string returns 0 — isNull check guards
  // nulls that come from malformed JSON.
  const result = await clickhouse.query({
    query: `
      SELECT
        event_name,
        property_key,
        maxIf(1, NOT isNull(JSONExtractFloat(properties, property_key))
                 AND JSONExtractFloat(properties, property_key) != 0) AS is_numeric
      FROM (
        SELECT event_name, properties
        FROM events
        ORDER BY ingested_at DESC
        LIMIT 10000
      ) AS sample
      LEFT ARRAY JOIN JSONExtractKeys(properties) AS property_key
      GROUP BY event_name, property_key
      ORDER BY event_name, property_key
    `,
    format: "JSONEachRow",
  });

  const rows = await result.json<{
    event_name: string;
    property_key: string;
    is_numeric: number;
  }>();

  // Build response by grouping rows
  const eventNamesSet = new Set<string>();
  const properties: SchemaResponse["properties"] = {};

  for (const row of rows) {
    eventNamesSet.add(row.event_name);

    // Skip empty property keys (events with properties = '{}')
    if (!row.property_key) continue;

    if (!properties[row.event_name]) {
      properties[row.event_name] = {};
    }
    properties[row.event_name][row.property_key] = row.is_numeric
      ? "numeric"
      : "string";
  }

  const schema: SchemaResponse = {
    event_names: Array.from(eventNamesSet).sort(),
    properties,
  };

  setCachedSchema(schema);

  return NextResponse.json(schema);
}
