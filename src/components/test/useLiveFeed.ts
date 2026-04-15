"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { EventRow } from "@/lib/identity";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ConnectionStatus = "live" | "disconnected";

export interface UseLiveFeedResult {
  events: EventRow[];
  paused: boolean;
  connectionStatus: ConnectionStatus;
  togglePause: () => void;
  clearEvents: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_EVENTS = 200;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useLiveFeed(): UseLiveFeedResult {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [paused, setPaused] = useState(false);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");

  // Refs to avoid stale closures inside the EventSource handlers
  const pausedRef = useRef(false);
  const bufferRef = useRef<EventRow[]>([]);

  useEffect(() => {
    const es = new EventSource("/api/live");

    es.onopen = () => {
      setConnectionStatus("live");
    };

    es.onmessage = (e: MessageEvent) => {
      try {
        const row = JSON.parse(e.data as string) as EventRow;
        if (pausedRef.current) {
          // Buffer newest-first: prepend
          bufferRef.current = [row, ...bufferRef.current];
        } else {
          setEvents((prev) => {
            const next = [row, ...prev];
            return next.length > MAX_EVENTS ? next.slice(0, MAX_EVENTS) : next;
          });
        }
      } catch {
        // ignore malformed SSE payloads
      }
    };

    es.onerror = () => {
      setConnectionStatus("disconnected");
    };

    return () => {
      es.close();
    };
  }, []);

  const togglePause = useCallback(() => {
    setPaused((prevPaused) => {
      const nextPaused = !prevPaused;
      pausedRef.current = nextPaused;

      if (!nextPaused) {
        // Resuming — flush buffered events (newest first) into state
        const buffered = bufferRef.current;
        bufferRef.current = [];
        if (buffered.length > 0) {
          setEvents((prevEvents) => {
            const merged = [...buffered, ...prevEvents];
            return merged.length > MAX_EVENTS
              ? merged.slice(0, MAX_EVENTS)
              : merged;
          });
        }
      }

      return nextPaused;
    });
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
    bufferRef.current = [];
  }, []);

  return { events, paused, connectionStatus, togglePause, clearEvents };
}
