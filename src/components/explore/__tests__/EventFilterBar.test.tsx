// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EventFilterBar } from "@/components/explore/EventFilterBar";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

function makeSchemaResponse(event_names: string[]) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ event_names }),
  });
}

describe("EventFilterBar", () => {
  it("fetches event names from /api/schema on mount", async () => {
    mockFetch.mockReturnValue(
      makeSchemaResponse(["Page Viewed", "Purchase Completed"]),
    );
    render(<EventFilterBar onFilterChange={vi.fn()} />);
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("/api/schema");
  });

  it("renders the filter input", () => {
    mockFetch.mockReturnValue(makeSchemaResponse([]));
    render(<EventFilterBar onFilterChange={vi.fn()} />);
    // MUI Autocomplete renders a combobox input
    expect(screen.getByRole("combobox")).toBeTruthy();
  });

  it("does not crash when schema fetch fails", async () => {
    mockFetch.mockReturnValue(Promise.reject(new Error("network error")));
    render(<EventFilterBar onFilterChange={vi.fn()} />);
    // Should still render a functional input
    expect(screen.getByRole("combobox")).toBeTruthy();
  });
});
