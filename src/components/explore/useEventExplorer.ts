"use client";

import { useCallback, useEffect, useState } from "react";
import type { EventRow } from "@/lib/identity";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EventsListResponse {
  events: EventRow[];
  next_cursor: string | null;
}

export interface UseEventExplorerResult {
  events: EventRow[];
  loading: boolean;
  hasMore: boolean;
  loadMore: () => void;
  filter: string | null;
  setFilter: (eventName: string | null) => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useEventExplorer(): UseEventExplorerResult {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [filter, setFilterState] = useState<string | null>(null);

  const fetchEvents = useCallback(
    async (opts: {
      filter: string | null;
      cursor: string | null;
      append: boolean;
    }) => {
      setLoading(true);
      try {
        const url = new URL("/api/events/list", window.location.origin);
        if (opts.filter) url.searchParams.set("event_name", opts.filter);
        if (opts.cursor) url.searchParams.set("before", opts.cursor);
        url.searchParams.set("limit", "50");

        const res = await fetch(url.toString());
        const data = (await res.json()) as EventsListResponse;

        setEvents((prev) =>
          opts.append ? [...prev, ...data.events] : data.events,
        );
        setCursor(data.next_cursor);
        setHasMore(data.next_cursor !== null);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Load the first page on mount
  useEffect(() => {
    fetchEvents({ filter: null, cursor: null, append: false });
  }, [fetchEvents]);

  const setFilter = useCallback(
    (eventName: string | null) => {
      setFilterState(eventName);
      setEvents([]);
      setCursor(null);
      setHasMore(false);
      fetchEvents({ filter: eventName, cursor: null, append: false });
    },
    [fetchEvents],
  );

  const loadMore = useCallback(() => {
    if (loading || !hasMore) return;
    fetchEvents({ filter, cursor, append: true });
  }, [loading, hasMore, filter, cursor, fetchEvents]);

  return { events, loading, hasMore, loadMore, filter, setFilter };
}
