// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TrendsControls } from "@/components/trends/TrendsControls";
import type {
  UseTrendsControls,
  UseTrendsSetters,
} from "@/components/trends/useTrends";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeControls(
  overrides: Partial<UseTrendsControls> = {},
): UseTrendsControls {
  return {
    eventName: null,
    measure: "count",
    granularity: "day",
    startDate: "2026-03-16",
    endDate: "2026-04-15",
    breakdown: null,
    breakdownLimit: 10,
    ...overrides,
  };
}

function makeSetters(): UseTrendsSetters {
  return {
    setEventName: vi.fn(),
    setMeasure: vi.fn(),
    setGranularity: vi.fn(),
    setStartDate: vi.fn(),
    setEndDate: vi.fn(),
    setBreakdown: vi.fn(),
    setBreakdownLimit: vi.fn(),
  };
}

const sampleSchema = {
  event_names: ["Page Viewed", "Purchase Completed"],
  properties: {
    "Purchase Completed": {
      amount: "numeric" as const,
      currency: "string" as const,
    },
  },
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("TrendsControls", () => {
  describe("event name autocomplete", () => {
    it("renders the event name autocomplete input", () => {
      render(
        <TrendsControls
          schema={sampleSchema}
          controls={makeControls()}
          setters={makeSetters()}
          numericProperties={[]}
        />,
      );
      // Autocomplete renders a combobox
      const combos = screen.getAllByRole("combobox");
      expect(combos.length).toBeGreaterThanOrEqual(1);
    });

    it("renders with provided event names available as options", () => {
      render(
        <TrendsControls
          schema={sampleSchema}
          controls={makeControls()}
          setters={makeSetters()}
          numericProperties={[]}
        />,
      );
      // Event name autocomplete should be present
      expect(screen.getAllByRole("combobox").length).toBeGreaterThanOrEqual(1);
    });

    it("renders without crashing when schema is null", () => {
      render(
        <TrendsControls
          schema={null}
          controls={makeControls()}
          setters={makeSetters()}
          numericProperties={[]}
        />,
      );
      expect(screen.getAllByRole("combobox").length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("measure selector", () => {
    it("renders measure options including Count and Unique Users", () => {
      render(
        <TrendsControls
          schema={sampleSchema}
          controls={makeControls()}
          setters={makeSetters()}
          numericProperties={[]}
        />,
      );
      expect(screen.getByText("Count")).toBeTruthy();
      expect(screen.getByText("Unique Users")).toBeTruthy();
    });

    it("renders Sum of, Avg of, Min of, Max of measure options", () => {
      render(
        <TrendsControls
          schema={sampleSchema}
          controls={makeControls()}
          setters={makeSetters()}
          numericProperties={[]}
        />,
      );
      expect(screen.getByText("Sum of")).toBeTruthy();
      expect(screen.getByText("Avg of")).toBeTruthy();
      expect(screen.getByText("Min of")).toBeTruthy();
      expect(screen.getByText("Max of")).toBeTruthy();
    });

    it("does not show the property dropdown when measure is 'count'", () => {
      render(
        <TrendsControls
          schema={sampleSchema}
          controls={makeControls({ measure: "count" })}
          setters={makeSetters()}
          numericProperties={["amount"]}
        />,
      );
      // Property autocomplete should not be present for "count"
      expect(screen.queryByLabelText("Property")).toBeNull();
      expect(screen.queryByTestId("measure-property-select")).toBeNull();
    });

    it("does not show the property dropdown when measure is 'unique_users'", () => {
      render(
        <TrendsControls
          schema={sampleSchema}
          controls={makeControls({ measure: "unique_users" })}
          setters={makeSetters()}
          numericProperties={["amount"]}
        />,
      );
      expect(screen.queryByLabelText("Property")).toBeNull();
    });

    it("shows property dropdown when measure starts with 'sum:'", () => {
      render(
        <TrendsControls
          schema={sampleSchema}
          controls={makeControls({ measure: "sum:amount" })}
          setters={makeSetters()}
          numericProperties={["amount"]}
        />,
      );
      expect(screen.getByLabelText("Property")).toBeTruthy();
    });

    it("shows property dropdown when measure starts with 'avg:'", () => {
      render(
        <TrendsControls
          schema={sampleSchema}
          controls={makeControls({ measure: "avg:amount" })}
          setters={makeSetters()}
          numericProperties={["amount"]}
        />,
      );
      expect(screen.getByLabelText("Property")).toBeTruthy();
    });

    it("shows property dropdown when measure starts with 'min:'", () => {
      render(
        <TrendsControls
          schema={sampleSchema}
          controls={makeControls({ measure: "min:amount" })}
          setters={makeSetters()}
          numericProperties={["amount"]}
        />,
      );
      expect(screen.getByLabelText("Property")).toBeTruthy();
    });

    it("shows property dropdown when measure starts with 'max:'", () => {
      render(
        <TrendsControls
          schema={sampleSchema}
          controls={makeControls({ measure: "max:amount" })}
          setters={makeSetters()}
          numericProperties={["amount"]}
        />,
      );
      expect(screen.getByLabelText("Property")).toBeTruthy();
    });
  });

  describe("granularity toggle", () => {
    it("renders Day and Week granularity buttons", () => {
      render(
        <TrendsControls
          schema={sampleSchema}
          controls={makeControls()}
          setters={makeSetters()}
          numericProperties={[]}
        />,
      );
      expect(screen.getByText("Day")).toBeTruthy();
      expect(screen.getByText("Week")).toBeTruthy();
    });
  });

  describe("date range preset chips", () => {
    it("renders the Last 7d preset chip", () => {
      render(
        <TrendsControls
          schema={sampleSchema}
          controls={makeControls()}
          setters={makeSetters()}
          numericProperties={[]}
        />,
      );
      expect(screen.getByText("Last 7d")).toBeTruthy();
    });

    it("renders the Last 30d preset chip", () => {
      render(
        <TrendsControls
          schema={sampleSchema}
          controls={makeControls()}
          setters={makeSetters()}
          numericProperties={[]}
        />,
      );
      expect(screen.getByText("Last 30d")).toBeTruthy();
    });

    it("renders the Last 90d preset chip", () => {
      render(
        <TrendsControls
          schema={sampleSchema}
          controls={makeControls()}
          setters={makeSetters()}
          numericProperties={[]}
        />,
      );
      expect(screen.getByText("Last 90d")).toBeTruthy();
    });
  });

  describe("breakdown selector", () => {
    it("renders the breakdown autocomplete", () => {
      render(
        <TrendsControls
          schema={sampleSchema}
          controls={makeControls()}
          setters={makeSetters()}
          numericProperties={[]}
        />,
      );
      // Breakdown selector should be present (combobox or labelled input)
      expect(screen.getByLabelText("Breakdown by")).toBeTruthy();
    });
  });

  describe("container test id", () => {
    it("renders a container with data-testid='trends-controls'", () => {
      render(
        <TrendsControls
          schema={sampleSchema}
          controls={makeControls()}
          setters={makeSetters()}
          numericProperties={[]}
        />,
      );
      expect(screen.getByTestId("trends-controls")).toBeTruthy();
    });
  });
});
