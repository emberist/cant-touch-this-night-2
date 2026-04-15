// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useUserProfile } from "@/components/users/useUserProfile";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const sampleProfile = {
  resolved_id: "user@example.com",
  first_seen: "2026-03-01T10:00:00.000Z",
  last_seen: "2026-04-10T15:30:00.000Z",
  identity_cluster: {
    user_ids: ["user@example.com"],
    device_ids: ["device-abc", "device-xyz"],
  },
  events: [
    {
      event_id: "uuid-1",
      event_name: "Page Viewed",
      timestamp: "2026-04-10T15:30:00.000Z",
      device_id: "device-abc",
      user_id: "user@example.com",
      properties: "{}",
      ingested_at: "2026-04-10T15:30:00.100Z",
      resolved_id: "user@example.com",
    },
  ],
};

function makeOkResponse(body: unknown) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  });
}

function makeErrorResponse(status: number, body: unknown) {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve(body),
  });
}

// ─── Setup ────────────────────────────────────────────────────────────────────

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
  mockFetch.mockReturnValue(makeOkResponse(sampleProfile));
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("useUserProfile", () => {
  describe("initial fetch", () => {
    it("fetches profile from /api/users/{id} on mount", async () => {
      renderHook(() => useUserProfile("user@example.com"));
      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toBe("/api/users/user%40example.com");
    });

    it("populates profile with API response data on success", async () => {
      const { result } = renderHook(() => useUserProfile("user@example.com"));
      await waitFor(() => expect(result.current.profile).not.toBeNull());
      expect(result.current.profile?.resolved_id).toBe("user@example.com");
      expect(result.current.profile?.identity_cluster.user_ids).toEqual([
        "user@example.com",
      ]);
      expect(result.current.profile?.identity_cluster.device_ids).toEqual([
        "device-abc",
        "device-xyz",
      ]);
      expect(result.current.profile?.events).toHaveLength(1);
    });
  });

  describe("loading state", () => {
    it("sets loading to true during fetch, false after completion", async () => {
      let resolveFetch!: (v: unknown) => void;
      mockFetch.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
      );

      const { result } = renderHook(() => useUserProfile("user@example.com"));
      await waitFor(() => expect(result.current.loading).toBe(true));

      resolveFetch({
        ok: true,
        status: 200,
        json: () => Promise.resolve(sampleProfile),
      });

      await waitFor(() => expect(result.current.loading).toBe(false));
    });

    it("sets loading to false after fetch completes successfully", async () => {
      const { result } = renderHook(() => useUserProfile("user@example.com"));
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.profile).not.toBeNull();
    });
  });

  describe("error handling", () => {
    it("sets error when API returns 404", async () => {
      mockFetch.mockReturnValue(makeErrorResponse(404, { error: "Not found" }));
      const { result } = renderHook(() => useUserProfile("unknown-user"));
      await waitFor(() => expect(result.current.error).not.toBeNull());
      expect(result.current.profile).toBeNull();
      expect(result.current.loading).toBe(false);
    });

    it("sets error when fetch fails with network error", async () => {
      mockFetch.mockReturnValue(Promise.reject(new Error("Network error")));
      const { result } = renderHook(() => useUserProfile("user@example.com"));
      await waitFor(() => expect(result.current.error).not.toBeNull());
      expect(result.current.profile).toBeNull();
      expect(result.current.loading).toBe(false);
    });
  });

  describe("URL encoding", () => {
    it("URL-encodes the resolved_id in the request path", async () => {
      renderHook(() => useUserProfile("user@example.com"));
      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toBe("/api/users/user%40example.com");
    });
  });

  describe("re-fetch on parameter change", () => {
    it("re-fetches when resolved_id changes", async () => {
      const { rerender } = renderHook(
        ({ id }: { id: string }) => useUserProfile(id),
        { initialProps: { id: "user-a" } },
      );

      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
      expect(mockFetch.mock.calls[0][0] as string).toContain("user-a");

      rerender({ id: "user-b" });

      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
      expect(mockFetch.mock.calls[1][0] as string).toContain("user-b");
    });
  });
});
