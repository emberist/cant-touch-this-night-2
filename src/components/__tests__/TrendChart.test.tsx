// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TrendChart } from "@/components/TrendChart";
import type { Series } from "@/lib/trends";

// ─── Mock recharts ─────────────────────────────────────────────────────────────
// Recharts needs ResizeObserver and real DOM dimensions to render.
// jsdom has zero-size containers, so we stub the chart components.

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="recharts-line-chart">{children}</div>
  ),
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="recharts-bar-chart">{children}</div>
  ),
  AreaChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="recharts-area-chart">{children}</div>
  ),
  Line: () => null,
  Bar: () => null,
  Area: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeSeries(numPoints: number): Series[] {
  const data = Array.from({ length: numPoints }, (_, i) => ({
    date: `2026-04-${String(i + 1).padStart(2, "0")}`,
    value: i * 10,
  }));
  return [{ label: "Page Viewed", data }];
}

function makeMultiSeries(numPoints: number): Series[] {
  const data = Array.from({ length: numPoints }, (_, i) => ({
    date: `2026-04-${String(i + 1).padStart(2, "0")}`,
    value: i * 10,
  }));
  return [
    { label: "US", data },
    { label: "UK", data },
  ];
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("TrendChart", () => {
  describe("chart type toggle", () => {
    it("renders chart type toggle with Line option", () => {
      render(<TrendChart series={makeSeries(5)} loading={false} />);
      expect(screen.getByText("Line")).toBeTruthy();
    });

    it("renders chart type toggle with Bar option", () => {
      render(<TrendChart series={makeSeries(5)} loading={false} />);
      expect(screen.getByText("Bar")).toBeTruthy();
    });

    it("renders chart type toggle with Area option", () => {
      render(<TrendChart series={makeSeries(5)} loading={false} />);
      expect(screen.getByText("Area")).toBeTruthy();
    });

    it("renders chart type toggle with Table option", () => {
      render(<TrendChart series={makeSeries(5)} loading={false} />);
      expect(screen.getByText("Table")).toBeTruthy();
    });
  });

  describe("empty state", () => {
    it("renders an empty state message when series is empty", () => {
      render(<TrendChart series={[]} loading={false} />);
      // Should show something indicating no data
      const noDataEl =
        screen.queryByText(/no data/i) ??
        screen.queryByTestId("trend-chart-empty");
      expect(noDataEl).not.toBeNull();
    });

    it("does not render a recharts chart when series is empty", () => {
      render(<TrendChart series={[]} loading={false} />);
      expect(screen.queryByTestId("recharts-line-chart")).toBeNull();
      expect(screen.queryByTestId("recharts-bar-chart")).toBeNull();
    });
  });

  describe("loading state", () => {
    it("shows a loading skeleton when loading is true", () => {
      render(<TrendChart series={[]} loading={true} />);
      // Loading skeleton should be present (MUI Skeleton or data-testid)
      const skeleton =
        screen.queryByTestId("trend-chart-skeleton") ??
        screen.queryByRole("progressbar") ??
        document.querySelector(".MuiSkeleton-root");
      expect(skeleton).not.toBeNull();
    });

    it("does not render empty state when loading is true", () => {
      render(<TrendChart series={[]} loading={true} />);
      expect(screen.queryByTestId("trend-chart-empty")).toBeNull();
    });
  });

  describe("auto-switch to Bar", () => {
    it("defaults to Bar chart type when series has exactly 1 data point", () => {
      render(<TrendChart series={makeSeries(1)} loading={false} />);
      // Bar chart component should be rendered (not line)
      expect(screen.queryByTestId("recharts-bar-chart")).not.toBeNull();
      expect(screen.queryByTestId("recharts-line-chart")).toBeNull();
    });

    it("defaults to Line chart type when series has multiple data points", () => {
      render(<TrendChart series={makeSeries(5)} loading={false} />);
      expect(screen.queryByTestId("recharts-line-chart")).not.toBeNull();
      expect(screen.queryByTestId("recharts-bar-chart")).toBeNull();
    });
  });

  describe("table mode", () => {
    it("renders a table when Table chart type is selected", () => {
      render(<TrendChart series={makeSeries(3)} loading={false} />);
      fireEvent.click(screen.getByText("Table"));
      expect(screen.getByRole("table")).toBeTruthy();
    });

    it("table includes date column data", () => {
      render(<TrendChart series={makeSeries(3)} loading={false} />);
      fireEvent.click(screen.getByText("Table"));
      // Dates should appear in the table
      expect(screen.getByText("2026-04-01")).toBeTruthy();
    });

    it("does not render recharts chart when Table mode is active", () => {
      render(<TrendChart series={makeSeries(3)} loading={false} />);
      fireEvent.click(screen.getByText("Table"));
      expect(screen.queryByTestId("recharts-line-chart")).toBeNull();
      expect(screen.queryByTestId("recharts-bar-chart")).toBeNull();
    });
  });

  describe("chart container", () => {
    it("renders a container with data-testid='trend-chart'", () => {
      render(<TrendChart series={makeSeries(3)} loading={false} />);
      expect(screen.getByTestId("trend-chart")).toBeTruthy();
    });
  });
});
