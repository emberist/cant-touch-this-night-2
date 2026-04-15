// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProgressPanel } from "@/components/generate/ProgressPanel";
import type { ProgressState } from "@/components/generate/useGenerator";

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeProgress(overrides: Partial<ProgressState> = {}): ProgressState {
  return {
    job_id: "test-job-1",
    status: "running",
    inserted: 50000,
    total: 1000000,
    throughput: 125000,
    eta_seconds: 7,
    elapsed_ms: 400,
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ProgressPanel", () => {
  describe("progress bar", () => {
    it("renders with correct percentage label", () => {
      render(<ProgressPanel progress={makeProgress()} onCancel={vi.fn()} />);
      // 50000/1000000 = 5%
      expect(screen.getByText(/5%/)).toBeTruthy();
    });

    it("renders inserted/total counts", () => {
      render(<ProgressPanel progress={makeProgress()} onCancel={vi.fn()} />);
      expect(screen.getByText(/50[,.]?000/)).toBeTruthy();
      expect(screen.getByText(/1[,.]?000[,.]?000/)).toBeTruthy();
    });
  });

  describe("throughput and ETA", () => {
    it("displays throughput text", () => {
      render(<ProgressPanel progress={makeProgress()} onCancel={vi.fn()} />);
      // Should show something like "125,000 events/sec" or "~125000 events/sec"
      expect(screen.getByText(/125[,.]?000/)).toBeTruthy();
    });

    it("displays ETA text when eta_seconds > 0", () => {
      render(
        <ProgressPanel
          progress={makeProgress({ eta_seconds: 7 })}
          onCancel={vi.fn()}
        />,
      );
      expect(screen.getByText(/7s|7 sec/i)).toBeTruthy();
    });
  });

  describe("status chip", () => {
    it("shows 'Running' chip when status is running", () => {
      render(
        <ProgressPanel
          progress={makeProgress({ status: "running" })}
          onCancel={vi.fn()}
        />,
      );
      expect(screen.getByText(/running/i)).toBeTruthy();
    });

    it("shows 'Queued' chip when status is queued", () => {
      render(
        <ProgressPanel
          progress={makeProgress({
            status: "queued",
            inserted: 0,
            throughput: 0,
            eta_seconds: 0,
          })}
          onCancel={vi.fn()}
        />,
      );
      expect(screen.getByText(/queued/i)).toBeTruthy();
    });

    it("shows 'Complete' chip when status is complete", () => {
      render(
        <ProgressPanel
          progress={makeProgress({
            status: "complete",
            inserted: 1000000,
            eta_seconds: 0,
          })}
          onCancel={vi.fn()}
        />,
      );
      expect(screen.getByText(/complete/i)).toBeTruthy();
    });

    it("shows 'Failed' chip when status is failed", () => {
      render(
        <ProgressPanel
          progress={makeProgress({ status: "failed" })}
          onCancel={vi.fn()}
        />,
      );
      expect(screen.getByText(/failed/i)).toBeTruthy();
    });

    it("shows 'Cancelled' chip when status is cancelled", () => {
      render(
        <ProgressPanel
          progress={makeProgress({ status: "cancelled" })}
          onCancel={vi.fn()}
        />,
      );
      expect(screen.getByText(/cancelled/i)).toBeTruthy();
    });
  });

  describe("cancel button", () => {
    it("cancel button is visible when status is 'running'", () => {
      render(
        <ProgressPanel
          progress={makeProgress({ status: "running" })}
          onCancel={vi.fn()}
        />,
      );
      expect(screen.queryByRole("button", { name: /cancel/i })).not.toBeNull();
    });

    it("cancel button is visible when status is 'queued'", () => {
      render(
        <ProgressPanel
          progress={makeProgress({
            status: "queued",
            inserted: 0,
            throughput: 0,
            eta_seconds: 0,
          })}
          onCancel={vi.fn()}
        />,
      );
      expect(screen.queryByRole("button", { name: /cancel/i })).not.toBeNull();
    });

    it("cancel button calls onCancel when clicked", () => {
      const mockCancel = vi.fn();
      render(
        <ProgressPanel
          progress={makeProgress({ status: "running" })}
          onCancel={mockCancel}
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
      expect(mockCancel).toHaveBeenCalledTimes(1);
    });

    it("cancel button is hidden when status is 'complete'", () => {
      render(
        <ProgressPanel
          progress={makeProgress({
            status: "complete",
            inserted: 1000000,
            eta_seconds: 0,
          })}
          onCancel={vi.fn()}
        />,
      );
      expect(screen.queryByRole("button", { name: /cancel/i })).toBeNull();
    });

    it("cancel button is hidden when status is 'failed'", () => {
      render(
        <ProgressPanel
          progress={makeProgress({ status: "failed" })}
          onCancel={vi.fn()}
        />,
      );
      expect(screen.queryByRole("button", { name: /cancel/i })).toBeNull();
    });
  });

  describe("completion links", () => {
    it("shows links to /explore and /trends when status is 'complete'", () => {
      render(
        <ProgressPanel
          progress={makeProgress({
            status: "complete",
            inserted: 1000000,
            eta_seconds: 0,
          })}
          onCancel={vi.fn()}
        />,
      );
      const links = screen.getAllByRole("link");
      const hrefs = links.map((l) => l.getAttribute("href"));
      expect(hrefs).toContain("/explore");
      expect(hrefs).toContain("/trends");
    });

    it("does not show completion links when status is 'running'", () => {
      render(
        <ProgressPanel
          progress={makeProgress({ status: "running" })}
          onCancel={vi.fn()}
        />,
      );
      const links = screen.queryAllByRole("link");
      const hrefs = links.map((l) => l.getAttribute("href"));
      expect(hrefs).not.toContain("/explore");
      expect(hrefs).not.toContain("/trends");
    });

    it("does not show completion links when status is 'failed'", () => {
      render(
        <ProgressPanel
          progress={makeProgress({ status: "failed" })}
          onCancel={vi.fn()}
        />,
      );
      const links = screen.queryAllByRole("link");
      const hrefs = links.map((l) => l.getAttribute("href"));
      expect(hrefs).not.toContain("/explore");
      expect(hrefs).not.toContain("/trends");
    });
  });
});
