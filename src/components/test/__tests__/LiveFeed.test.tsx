// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EventRow } from "@/lib/identity";

// ─── Module mocks (hoisted by vitest) ────────────────────────────────────────

// Mock Next.js Link to avoid router context requirement in jsdom
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    style,
  }: {
    href: string;
    children: React.ReactNode;
    style?: React.CSSProperties;
  }) => (
    <a href={href} style={style}>
      {children}
    </a>
  ),
}));

// Mock useLiveFeed so the component tests don't need EventSource
vi.mock("@/components/test/useLiveFeed", () => ({
  useLiveFeed: vi.fn(),
}));

import { LiveFeed } from "@/components/test/LiveFeed";
import { useLiveFeed } from "@/components/test/useLiveFeed";

const mockUseLiveFeed = vi.mocked(useLiveFeed);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeEventRow(id: string, overrides: Partial<EventRow> = {}): EventRow {
  return {
    event_id: id,
    event_name: "Page Viewed",
    timestamp: "2026-04-15T12:00:00.000Z",
    device_id: "device-abc",
    user_id: null,
    properties: '{"page":"/home"}',
    ingested_at: "2026-04-15T12:00:00.000Z",
    resolved_id: "device-abc",
    ...overrides,
  };
}

function defaultHookState(
  overrides: Partial<ReturnType<typeof useLiveFeed>> = {},
): ReturnType<typeof useLiveFeed> {
  return {
    events: [],
    paused: false,
    connectionStatus: "disconnected",
    togglePause: vi.fn(),
    clearEvents: vi.fn(),
    ...overrides,
  };
}

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  mockUseLiveFeed.mockReturnValue(defaultHookState());
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("LiveFeed", () => {
  describe("connection status indicator", () => {
    it("renders 'Disconnected' text when connectionStatus is 'disconnected'", () => {
      mockUseLiveFeed.mockReturnValue(
        defaultHookState({ connectionStatus: "disconnected" }),
      );
      render(<LiveFeed />);
      expect(screen.getByText(/disconnected/i)).toBeTruthy();
    });

    it("renders 'Live' text when connectionStatus is 'live'", () => {
      mockUseLiveFeed.mockReturnValue(
        defaultHookState({ connectionStatus: "live" }),
      );
      render(<LiveFeed />);
      expect(screen.getByText(/^live$/i)).toBeTruthy();
    });
  });

  describe("toolbar buttons", () => {
    it("renders a Pause button when not paused", () => {
      mockUseLiveFeed.mockReturnValue(defaultHookState({ paused: false }));
      render(<LiveFeed />);
      expect(screen.getByRole("button", { name: /pause/i })).toBeTruthy();
    });

    it("renders a Resume button when paused", () => {
      mockUseLiveFeed.mockReturnValue(defaultHookState({ paused: true }));
      render(<LiveFeed />);
      expect(screen.getByRole("button", { name: /resume/i })).toBeTruthy();
    });

    it("renders a Clear button", () => {
      render(<LiveFeed />);
      expect(screen.getByRole("button", { name: /clear/i })).toBeTruthy();
    });
  });

  describe("empty state", () => {
    it("shows 'No events yet' when events array is empty", () => {
      mockUseLiveFeed.mockReturnValue(defaultHookState({ events: [] }));
      render(<LiveFeed />);
      expect(screen.getByText(/no events yet/i)).toBeTruthy();
    });
  });

  describe("event cards", () => {
    it("renders an event card with event name when events exist", () => {
      const event = makeEventRow("ev-1", { event_name: "Purchase Completed" });
      mockUseLiveFeed.mockReturnValue(defaultHookState({ events: [event] }));
      render(<LiveFeed />);
      expect(screen.getByText("Purchase Completed")).toBeTruthy();
    });

    it("renders an event card with resolved identity", () => {
      const event = makeEventRow("ev-1", { resolved_id: "user@example.com" });
      mockUseLiveFeed.mockReturnValue(defaultHookState({ events: [event] }));
      render(<LiveFeed />);
      expect(screen.getByText("user@example.com")).toBeTruthy();
    });

    it("does not show 'No events yet' when events exist", () => {
      const event = makeEventRow("ev-1");
      mockUseLiveFeed.mockReturnValue(defaultHookState({ events: [event] }));
      render(<LiveFeed />);
      expect(screen.queryByText(/no events yet/i)).toBeNull();
    });

    it("renders multiple event cards", () => {
      const events = [
        makeEventRow("ev-1", { event_name: "Page Viewed" }),
        makeEventRow("ev-2", { event_name: "Button Clicked" }),
      ];
      mockUseLiveFeed.mockReturnValue(defaultHookState({ events }));
      render(<LiveFeed />);
      expect(screen.getByText("Page Viewed")).toBeTruthy();
      expect(screen.getByText("Button Clicked")).toBeTruthy();
    });
  });

  describe("interactions", () => {
    it("clicking Pause calls togglePause", () => {
      const togglePause = vi.fn();
      mockUseLiveFeed.mockReturnValue(
        defaultHookState({ paused: false, togglePause }),
      );
      render(<LiveFeed />);
      fireEvent.click(screen.getByRole("button", { name: /pause/i }));
      expect(togglePause).toHaveBeenCalledOnce();
    });

    it("clicking Pause button causes Resume button to appear after re-render with paused=true", () => {
      const togglePause = vi.fn();
      mockUseLiveFeed.mockReturnValue(
        defaultHookState({ paused: false, togglePause }),
      );
      const { rerender } = render(<LiveFeed />);
      expect(screen.getByRole("button", { name: /pause/i })).toBeTruthy();

      // Simulate hook returning paused: true after toggle
      mockUseLiveFeed.mockReturnValue(
        defaultHookState({ paused: true, togglePause }),
      );
      rerender(<LiveFeed />);

      expect(screen.getByRole("button", { name: /resume/i })).toBeTruthy();
    });

    it("clicking Clear calls clearEvents", () => {
      const clearEvents = vi.fn();
      mockUseLiveFeed.mockReturnValue(
        defaultHookState({
          events: [makeEventRow("ev-1")],
          clearEvents,
        }),
      );
      render(<LiveFeed />);
      fireEvent.click(screen.getByRole("button", { name: /clear/i }));
      expect(clearEvents).toHaveBeenCalledOnce();
    });
  });
});
