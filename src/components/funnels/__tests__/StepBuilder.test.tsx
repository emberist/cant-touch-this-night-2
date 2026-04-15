// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StepBuilder } from "@/components/funnels/StepBuilder";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderStepBuilder(
  steps: string[],
  overrides: {
    onAddStep?: () => void;
    onRemoveStep?: (index: number) => void;
    onSetStep?: (index: number, value: string) => void;
  } = {},
) {
  const props = {
    steps,
    eventNames: ["Page Viewed", "Signup Completed", "Purchase Completed"],
    onAddStep: overrides.onAddStep ?? vi.fn(),
    onRemoveStep: overrides.onRemoveStep ?? vi.fn(),
    onSetStep: overrides.onSetStep ?? vi.fn(),
  };
  render(<StepBuilder {...props} />);
  return props;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("StepBuilder", () => {
  describe("container", () => {
    it("renders data-testid='step-builder' container", () => {
      renderStepBuilder(["", ""]);
      expect(screen.getByTestId("step-builder")).toBeTruthy();
    });
  });

  describe("step inputs", () => {
    it("renders the correct number of comboboxes matching steps length", () => {
      renderStepBuilder(["Page Viewed", "Purchase Completed"]);
      const combos = screen.getAllByRole("combobox");
      expect(combos).toHaveLength(2);
    });

    it("renders 3 comboboxes when steps has 3 items", () => {
      renderStepBuilder([
        "Page Viewed",
        "Signup Completed",
        "Purchase Completed",
      ]);
      const combos = screen.getAllByRole("combobox");
      expect(combos).toHaveLength(3);
    });
  });

  describe("Add Step button", () => {
    it("renders the Add Step button", () => {
      renderStepBuilder(["", ""]);
      expect(screen.getByRole("button", { name: /add step/i })).toBeTruthy();
    });

    it("calls onAddStep when the button is clicked", () => {
      const onAddStep = vi.fn();
      renderStepBuilder(["", ""], { onAddStep });
      fireEvent.click(screen.getByRole("button", { name: /add step/i }));
      expect(onAddStep).toHaveBeenCalledTimes(1);
    });

    it("is disabled when steps.length === 5", () => {
      renderStepBuilder(["A", "B", "C", "D", "E"]);
      const btn = screen.getByRole("button", { name: /add step/i });
      expect(btn).toHaveProperty("disabled", true);
    });

    it("is not disabled when steps.length < 5", () => {
      renderStepBuilder(["A", "B"]);
      const btn = screen.getByRole("button", { name: /add step/i });
      expect(btn).toHaveProperty("disabled", false);
    });
  });

  describe("Remove buttons", () => {
    it("renders a remove button for each step", () => {
      renderStepBuilder([
        "Page Viewed",
        "Purchase Completed",
        "Signup Completed",
      ]);
      const removeBtns = screen.getAllByRole("button", {
        name: /remove step/i,
      });
      expect(removeBtns).toHaveLength(3);
    });

    it("calls onRemoveStep with the correct index when clicked", () => {
      const onRemoveStep = vi.fn();
      renderStepBuilder(
        ["Page Viewed", "Purchase Completed", "Signup Completed"],
        {
          onRemoveStep,
        },
      );
      const removeBtns = screen.getAllByRole("button", {
        name: /remove step/i,
      });
      fireEvent.click(removeBtns[1]);
      expect(onRemoveStep).toHaveBeenCalledWith(1);
    });

    it("remove buttons are disabled when steps.length === 2", () => {
      renderStepBuilder(["", ""]);
      const removeBtns = screen.getAllByRole("button", {
        name: /remove step/i,
      });
      for (const btn of removeBtns) {
        expect(btn).toHaveProperty("disabled", true);
      }
    });

    it("remove buttons are not disabled when steps.length > 2", () => {
      renderStepBuilder(["A", "B", "C"]);
      const removeBtns = screen.getAllByRole("button", {
        name: /remove step/i,
      });
      for (const btn of removeBtns) {
        expect(btn).toHaveProperty("disabled", false);
      }
    });
  });
});
