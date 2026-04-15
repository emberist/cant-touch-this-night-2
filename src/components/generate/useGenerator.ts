"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  EventTypeWeight,
  JobState,
  JobStatus,
  NumericVariance,
} from "@/lib/generator";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GeneratorFormState {
  total: number;
  users: number;
  start: string;
  end: string;
  event_types: EventTypeWeight[];
  identity_resolution: boolean;
  anonymous_ratio: number;
  numeric_variance: NumericVariance;
}

export interface ProgressState {
  job_id: string;
  status: JobStatus;
  inserted: number;
  total: number;
  throughput: number;
  eta_seconds: number;
  elapsed_ms: number;
  error?: string;
}

export type Preset = "realistic" | "high-volume" | "stress-test";

export interface UseGeneratorResult {
  form: GeneratorFormState;
  setForm: (updates: Partial<GeneratorFormState>) => void;
  applyPreset: (preset: Preset) => void;
  startJob: () => Promise<void>;
  cancelJob: () => Promise<void>;
  fetchJobs: () => Promise<void>;
  jobActive: boolean;
  progress: ProgressState | null;
  jobs: JobState[];
  error: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_EVENT_TYPES: EventTypeWeight[] = [
  { name: "Page Viewed", weight: 0.4 },
  { name: "Button Clicked", weight: 0.15 },
  { name: "Signup Completed", weight: 0.12 },
  { name: "Purchase Completed", weight: 0.13 },
  { name: "Subscription Renewed", weight: 0.12 },
  { name: "Support Ticket Opened", weight: 0.08 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoISO(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function defaultForm(): GeneratorFormState {
  return {
    total: 10000,
    users: 100,
    start: daysAgoISO(30),
    end: todayISO(),
    event_types: DEFAULT_EVENT_TYPES,
    identity_resolution: true,
    anonymous_ratio: 30,
    numeric_variance: "medium",
  };
}

const TERMINAL_STATUSES = new Set<JobStatus>([
  "complete",
  "failed",
  "cancelled",
]);

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useGenerator(): UseGeneratorResult {
  const [form, setFormState] = useState<GeneratorFormState>(defaultForm);
  const [jobActive, setJobActive] = useState(false);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [jobs, setJobs] = useState<JobState[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Tracks the current job_id for cancelJob()
  const currentJobIdRef = useRef<string | null>(null);
  // Holds the active EventSource so we can close it
  const esRef = useRef<EventSource | null>(null);

  // Close any active EventSource on unmount
  useEffect(() => {
    return () => {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, []);

  const setForm = useCallback((updates: Partial<GeneratorFormState>) => {
    setFormState((prev) => {
      const next = { ...prev, ...updates };
      // Special rule: toggling identity_resolution off resets anonymous_ratio
      if (updates.identity_resolution === false) {
        next.anonymous_ratio = 0;
      }
      return next;
    });
  }, []);

  const applyPreset = useCallback((preset: Preset) => {
    switch (preset) {
      case "realistic":
        setFormState((prev) => ({
          ...prev,
          total: 10000,
          users: 100,
          start: daysAgoISO(30),
          end: todayISO(),
        }));
        break;
      case "high-volume":
        setFormState((prev) => ({
          ...prev,
          total: 100000,
          users: 200,
          start: daysAgoISO(90),
          end: todayISO(),
        }));
        break;
      case "stress-test":
        setFormState((prev) => ({
          ...prev,
          total: 1000000,
          users: 500,
          start: daysAgoISO(365),
          end: todayISO(),
        }));
        break;
    }
  }, []);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/generate/jobs");
      if (res.ok) {
        const data = (await res.json()) as JobState[];
        setJobs(data);
      }
    } catch {
      // non-fatal: jobs list stays stale
    }
  }, []);

  // Load jobs on mount
  useEffect(() => {
    void fetchJobs();
  }, [fetchJobs]);

  const startJob = useCallback(async (): Promise<void> => {
    setError(null);

    const body: GeneratorFormState = form;

    let res: Response;
    try {
      res = await fetch("/api/generate/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      return;
    }

    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? `HTTP ${res.status}`);
      return;
    }

    const { job_id } = (await res.json()) as { job_id: string };
    currentJobIdRef.current = job_id;
    setJobActive(true);
    setProgress({
      job_id,
      status: "queued",
      inserted: 0,
      total: form.total,
      throughput: 0,
      eta_seconds: 0,
      elapsed_ms: 0,
    });

    // Open SSE stream
    const es = new EventSource(`/api/generate/${job_id}/status`);
    esRef.current = es;

    es.onmessage = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data as string) as Partial<ProgressState> & {
          status: JobStatus;
        };
        setProgress((prev) => ({
          job_id,
          status: data.status,
          inserted: data.inserted ?? prev?.inserted ?? 0,
          total: data.total ?? prev?.total ?? form.total,
          throughput: data.throughput ?? prev?.throughput ?? 0,
          eta_seconds: data.eta_seconds ?? prev?.eta_seconds ?? 0,
          elapsed_ms: data.elapsed_ms ?? prev?.elapsed_ms ?? 0,
          error: data.error,
        }));

        if (TERMINAL_STATUSES.has(data.status)) {
          setJobActive(false);
          es.close();
          esRef.current = null;
          // Refresh job list after completion
          void fetchJobs();
        }
      } catch {
        // ignore malformed SSE payload
      }
    };

    es.onerror = () => {
      setJobActive(false);
      setError("SSE connection error");
      es.close();
      esRef.current = null;
    };
  }, [form, fetchJobs]);

  const cancelJob = useCallback(async (): Promise<void> => {
    const jobId = currentJobIdRef.current;
    if (!jobId) return;

    try {
      await fetch(`/api/generate/${jobId}/cancel`, { method: "POST" });
    } catch {
      // ignore
    }
  }, []);

  return {
    form,
    setForm,
    applyPreset,
    startJob,
    cancelJob,
    fetchJobs,
    jobActive,
    progress,
    jobs,
    error,
  };
}
