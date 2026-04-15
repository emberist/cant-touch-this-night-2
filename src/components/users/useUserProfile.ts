"use client";

import { useEffect, useState } from "react";
import type { UserProfile } from "@/lib/users";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UseUserProfileResult {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useUserProfile(resolved_id: string): UseUserProfileResult {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchProfile(): Promise<void> {
      setLoading(true);
      setError(null);
      setProfile(null);

      try {
        const url = `/api/users/${encodeURIComponent(resolved_id)}`;
        const res = await fetch(url);

        if (cancelled) return;

        if (!res.ok) {
          setError(`Failed to load profile (HTTP ${res.status})`);
          return;
        }

        const data = (await res.json()) as UserProfile;

        if (cancelled) return;

        setProfile(data);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchProfile();

    return () => {
      cancelled = true;
    };
  }, [resolved_id]);

  return { profile, loading, error };
}
