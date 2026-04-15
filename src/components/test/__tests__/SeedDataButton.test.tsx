// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SeedDataButton } from "@/components/test/SeedDataButton";
import type { SeedResult } from "@/components/test/useEventSender";

// ─── Setup ────────────────────────────────────────────────────────────────────

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("SeedDataButton", () => {
  describe("container", () => {
    it("renders data-testid='seed-data-button' container", () => {
      render(
        <SeedDataButton
          sendSeed={vi
            .fn<() => Promise<SeedResult>>()
            .mockResolvedValue({ success: true, eventCount: 0 })}
        />,
      );
      expect(screen.getByTestId("seed-data-button")).toBeTruthy();
    });
  });

  describe("button click", () => {
    it("clicking the button calls sendSeed", async () => {
      const mockSendSeed = vi
        .fn<() => Promise<SeedResult>>()
        .mockResolvedValue({ success: true, eventCount: 12000 });
      render(<SeedDataButton sendSeed={mockSendSeed} />);

      fireEvent.click(screen.getByRole("button", { name: /seed/i }));

      await waitFor(() => expect(mockSendSeed).toHaveBeenCalledTimes(1));
    });
  });

  describe("loading state", () => {
    it("disables the button while seed is in progress", async () => {
      let resolvePromise!: (v: SeedResult) => void;
      const mockSendSeed = vi.fn<() => Promise<SeedResult>>().mockReturnValue(
        new Promise<SeedResult>((resolve) => {
          resolvePromise = resolve;
        }),
      );
      render(<SeedDataButton sendSeed={mockSendSeed} />);

      fireEvent.click(screen.getByRole("button", { name: /seed/i }));

      await waitFor(() => {
        const btn = screen.getByRole("button", { name: /seed/i });
        expect(btn).toHaveProperty("disabled", true);
      });

      resolvePromise({ success: true, eventCount: 12000 });

      await waitFor(() => {
        const btn = screen.getByRole("button", { name: /seed/i });
        expect(btn).toHaveProperty("disabled", false);
      });
    });
  });

  describe("result display", () => {
    it("displays the event count on successful completion", async () => {
      const mockSendSeed = vi
        .fn<() => Promise<SeedResult>>()
        .mockResolvedValue({ success: true, eventCount: 12000 });
      render(<SeedDataButton sendSeed={mockSendSeed} />);

      fireEvent.click(screen.getByRole("button", { name: /seed/i }));

      await waitFor(() => {
        // Allow for comma-separated formatting or plain number
        expect(screen.queryByText(/12[,.]?000|12000/)).toBeTruthy();
      });
    });

    it("shows an error message on failure", async () => {
      const mockSendSeed = vi
        .fn<() => Promise<SeedResult>>()
        .mockResolvedValue({ success: false, error: "Server error" });
      render(<SeedDataButton sendSeed={mockSendSeed} />);

      fireEvent.click(screen.getByRole("button", { name: /seed/i }));

      await waitFor(() => {
        expect(screen.queryByText(/error|failed/i)).toBeTruthy();
      });
    });
  });
});
