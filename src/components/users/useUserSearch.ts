"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { UserListItem, UserSearchResult } from "@/lib/users";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UseUserSearchResult {
  users: UserListItem[];
  loading: boolean;
  hasMore: boolean;
  query: string;
  setQuery: (q: string) => void;
  loadMore: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

const DEBOUNCE_MS = 300;

export function useUserSearch(): UseUserSearchResult {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [query, setQueryState] = useState("");

  // Holds the current query ref so fetchUsers closure always has the latest value
  const queryRef = useRef(query);
  queryRef.current = query;

  const fetchUsers = useCallback(
    async (opts: { q: string; cursor: string | null; append: boolean }) => {
      setLoading(true);
      try {
        const url = new URL("/api/users", window.location.origin);
        if (opts.q) url.searchParams.set("q", opts.q);
        if (opts.cursor) url.searchParams.set("cursor", opts.cursor);
        url.searchParams.set("limit", "50");

        const res = await fetch(url.toString());
        const data = (await res.json()) as UserSearchResult;

        setUsers((prev) =>
          opts.append ? [...prev, ...data.users] : data.users,
        );
        setCursor(data.next_cursor);
        setHasMore(data.next_cursor !== null);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Fetch first page on mount (no query filter)
  useEffect(() => {
    fetchUsers({ q: "", cursor: null, append: false });
  }, [fetchUsers]);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setQuery = useCallback(
    (q: string) => {
      setQueryState(q);

      if (debounceTimer.current !== null) {
        clearTimeout(debounceTimer.current);
      }

      debounceTimer.current = setTimeout(() => {
        debounceTimer.current = null;
        setUsers([]);
        setCursor(null);
        setHasMore(false);
        fetchUsers({ q, cursor: null, append: false });
      }, DEBOUNCE_MS);
    },
    [fetchUsers],
  );

  const loadMore = useCallback(() => {
    if (loading || !hasMore) return;
    fetchUsers({ q: queryRef.current, cursor, append: true });
  }, [loading, hasMore, cursor, fetchUsers]);

  return { users, loading, hasMore, query, setQuery, loadMore };
}
