"use client";

import { useCallback, useEffect, useState } from "react";
import type { FunnelResponse } from "@/lib/funnels";
import type { SchemaResponse } from "@/lib/schema-cache";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UseFunnelsResult {
  schema: SchemaResponse | null;
  steps: string[];
  startDate: string;
  endDate: string;
  addStep: () => void;
  removeStep: (index: number) => void;
  setStep: (index: number, value: string) => void;
  setStartDate: (v: string) => void;
  setEndDate: (v: string) => void;
  runFunnel: () => void;
  result: FunnelResponse | null;
  loading: boolean;
  error: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useFunnels(): UseFunnelsResult {
  const [schema, setSchema] = useState<SchemaResponse | null>(null);
  const [steps, setSteps] = useState<string[]>(["", ""]);
  const [startDate, setStartDate] = useState(daysAgoISO(30));
  const [endDate, setEndDate] = useState(todayISO);
  const [result, setResult] = useState<FunnelResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch schema once on mount (for event name autocomplete)
  useEffect(() => {
    setLoading(true);
    fetch("/api/schema")
      .then((res) => res.json() as Promise<SchemaResponse>)
      .then((data) => {
        setSchema(data);
      })
      .catch(() => {
        // Schema stays null; controls still work
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const addStep = useCallback(() => {
    setSteps((prev) => {
      if (prev.length >= 5) return prev;
      return [...prev, ""];
    });
  }, []);

  const removeStep = useCallback((index: number) => {
    setSteps((prev) => {
      if (prev.length <= 2) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const setStep = useCallback((index: number, value: string) => {
    setSteps((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, []);

  const runFunnel = useCallback(() => {
    // Require at least 2 non-empty steps
    const nonEmpty = steps.filter((s) => s.trim() !== "");
    if (nonEmpty.length < 2) return;

    setLoading(true);
    setError(null);
    setResult(null);

    fetch("/api/funnels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        steps: steps.filter((s) => s.trim() !== ""),
        start: startDate,
        end: endDate,
      }),
    })
      .then((res) => res.json() as Promise<FunnelResponse>)
      .then((data) => {
        setResult(data);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unknown error");
        setResult(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [steps, startDate, endDate]);

  return {
    schema,
    steps,
    startDate,
    endDate,
    addStep,
    removeStep,
    setStep,
    setStartDate,
    setEndDate,
    runFunnel,
    result,
    loading,
    error,
  };
}
