"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SchemaResponse } from "@/lib/schema-cache";
import type { Series } from "@/lib/trends";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UseTrendsControls {
  eventName: string | null;
  measure: string;
  granularity: "day" | "week";
  startDate: string;
  endDate: string;
  breakdown: string | null;
  breakdownLimit: number;
}

export interface UseTrendsSetters {
  setEventName: (v: string | null) => void;
  setMeasure: (v: string) => void;
  setGranularity: (v: "day" | "week") => void;
  setStartDate: (v: string) => void;
  setEndDate: (v: string) => void;
  setBreakdown: (v: string | null) => void;
  setBreakdownLimit: (v: number) => void;
}

export interface UseTrendsResult {
  schema: SchemaResponse | null;
  controls: UseTrendsControls;
  setters: UseTrendsSetters;
  series: Series[];
  numericProperties: string[];
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

export function useTrends(): UseTrendsResult {
  const [schema, setSchema] = useState<SchemaResponse | null>(null);
  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Controls
  const [eventName, setEventName] = useState<string | null>(null);
  const [measure, setMeasure] = useState("count");
  const [granularity, setGranularity] = useState<"day" | "week">("day");
  const [startDate, setStartDate] = useState(daysAgoISO(30));
  const [endDate, setEndDate] = useState(todayISO);
  const [breakdown, setBreakdown] = useState<string | null>(null);
  const [breakdownLimit, setBreakdownLimit] = useState(10);

  // Fetch schema once on mount
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

  // Fetch trends whenever relevant controls change (only when eventName is set)
  const fetchTrends = useCallback(
    (
      name: string,
      opts: {
        measure: string;
        granularity: "day" | "week";
        startDate: string;
        endDate: string;
        breakdown: string | null;
        breakdownLimit: number;
      },
    ) => {
      const url = new URL("/api/trends", window.location.origin);
      url.searchParams.set("event_name", name);
      url.searchParams.set("measure", opts.measure);
      url.searchParams.set("granularity", opts.granularity);
      url.searchParams.set("start", opts.startDate);
      url.searchParams.set("end", opts.endDate);
      if (opts.breakdown) {
        url.searchParams.set("breakdown", opts.breakdown);
        url.searchParams.set("breakdown_limit", String(opts.breakdownLimit));
      }

      setLoading(true);
      setError(null);

      fetch(url.toString())
        .then((res) => res.json() as Promise<{ series: Series[] }>)
        .then((data) => {
          setSeries(data.series);
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : "Unknown error");
          setSeries([]);
        })
        .finally(() => {
          setLoading(false);
        });
    },
    [],
  );

  useEffect(() => {
    if (!eventName) return;
    fetchTrends(eventName, {
      measure,
      granularity,
      startDate,
      endDate,
      breakdown,
      breakdownLimit,
    });
  }, [
    eventName,
    measure,
    granularity,
    startDate,
    endDate,
    breakdown,
    breakdownLimit,
    fetchTrends,
  ]);

  // Derive numeric properties for the selected event from the schema
  const numericProperties = useMemo<string[]>(() => {
    if (!schema || !eventName) return [];
    const props = schema.properties[eventName] ?? {};
    return Object.entries(props)
      .filter(([, type]) => type === "numeric")
      .map(([name]) => name);
  }, [schema, eventName]);

  const controls: UseTrendsControls = {
    eventName,
    measure,
    granularity,
    startDate,
    endDate,
    breakdown,
    breakdownLimit,
  };

  const setters: UseTrendsSetters = {
    setEventName,
    setMeasure,
    setGranularity,
    setStartDate,
    setEndDate,
    setBreakdown,
    setBreakdownLimit,
  };

  return {
    schema,
    controls,
    setters,
    series,
    numericProperties,
    loading,
    error,
  };
}
