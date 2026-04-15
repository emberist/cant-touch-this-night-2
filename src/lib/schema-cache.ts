/** Cached schema response shape (matches GET /api/schema response). */
export interface SchemaResponse {
  event_names: string[];
  properties: Record<string, Record<string, "numeric" | "string">>;
}

const TTL_MS = 60_000; // 60 seconds

interface CacheEntry {
  value: SchemaResponse;
  cachedAt: number;
}

let entry: CacheEntry | null = null;

/** Returns the cached schema if it exists and is within TTL, otherwise null. */
export function getCachedSchema(): SchemaResponse | null {
  if (entry === null) return null;
  if (Date.now() - entry.cachedAt >= TTL_MS) {
    entry = null;
    return null;
  }
  return entry.value;
}

/** Stores a new schema response in the cache with the current timestamp. */
export function setCachedSchema(value: SchemaResponse): void {
  entry = { value, cachedAt: Date.now() };
}

/** Clears the cache. Used in tests and when data changes. */
export function invalidateSchemaCache(): void {
  entry = null;
}
