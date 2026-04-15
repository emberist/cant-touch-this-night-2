"use client";

import { useCallback, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EventPayload {
  event_name: string;
  device_id?: string;
  user_id?: string;
  timestamp?: string;
  properties?: Record<string, unknown>;
}

export interface SendResult {
  success: boolean;
  error?: string;
}

export interface SeedResult {
  success: boolean;
  eventCount?: number;
  error?: string;
}

export interface UseEventSenderResult {
  lastDeviceId: string | null;
  sendEvent: (payload: EventPayload) => Promise<SendResult>;
  sendSeed: () => Promise<SeedResult>;
  loading: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useEventSender(): UseEventSenderResult {
  const [lastDeviceId, setLastDeviceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const sendEvent = useCallback(
    async (payload: EventPayload): Promise<SendResult> => {
      setLoading(true);
      try {
        const res = await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          return {
            success: false,
            error: data.error ?? `HTTP ${res.status}`,
          };
        }

        if (payload.device_id) {
          setLastDeviceId(payload.device_id);
        }

        return { success: true };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        };
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const sendSeed = useCallback(async (): Promise<SeedResult> => {
    setLoading(true);
    try {
      const res = await fetch("/api/seed", { method: "POST" });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        return {
          success: false,
          error: data.error ?? `HTTP ${res.status}`,
        };
      }

      const statusRes = await fetch("/api/seed/status");
      const statusData = (await statusRes.json()) as {
        event_count?: number;
        user_count?: number;
      };

      return { success: true, eventCount: statusData.event_count };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    } finally {
      setLoading(false);
    }
  }, []);

  return { lastDeviceId, sendEvent, sendSeed, loading };
}
