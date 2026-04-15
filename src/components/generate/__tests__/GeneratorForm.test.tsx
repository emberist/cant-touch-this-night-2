// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GeneratorForm } from "@/components/generate/GeneratorForm";
import type { GeneratorFormState } from "@/components/generate/useGenerator";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeDefaultForm(): GeneratorFormState {
  const today = new Date().toISOString().slice(0, 10);
  const d = new Date();
  d.setDate(d.getDate() - 30);
  const start = d.toISOString().slice(0, 10);
  return {
    total: 10000,
    users: 100,
    start,
    end: today,
    event_types: [
      { name: "Page Viewed", weight: 0.4 },
      { name: "Button Clicked", weight: 0.15 },
      { name: "Signup Completed", weight: 0.12 },
      { name: "Purchase Completed", weight: 0.13 },
      { name: "Subscription Renewed", weight: 0.12 },
      { name: "Support Ticket Opened", weight: 0.08 },
    ],
    identity_resolution: true,
    anonymous_ratio: 30,
    numeric_variance: "medium",
  };
}

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GeneratorForm", () => {
  describe("form fields rendering", () => {
    it("renders total events number input", () => {
      render(
        <GeneratorForm
          form={makeDefaultForm()}
          setForm={vi.fn()}
          applyPreset={vi.fn()}
          onSubmit={vi.fn()}
          disabled={false}
        />,
      );
      // role=spinbutton for input[type=number]
      const totalInputs = screen.getAllByRole("spinbutton");
      expect(totalInputs.length).toBeGreaterThanOrEqual(1);
    });

    it("renders users number input", () => {
      render(
        <GeneratorForm
          form={makeDefaultForm()}
          setForm={vi.fn()}
          applyPreset={vi.fn()}
          onSubmit={vi.fn()}
          disabled={false}
        />,
      );
      const spinbuttons = screen.getAllByRole("spinbutton");
      expect(spinbuttons.length).toBeGreaterThanOrEqual(2);
    });

    it("renders start date input", () => {
      render(
        <GeneratorForm
          form={makeDefaultForm()}
          setForm={vi.fn()}
          applyPreset={vi.fn()}
          onSubmit={vi.fn()}
          disabled={false}
        />,
      );
      expect(screen.getByLabelText(/start/i)).toBeTruthy();
    });

    it("renders end date input", () => {
      render(
        <GeneratorForm
          form={makeDefaultForm()}
          setForm={vi.fn()}
          applyPreset={vi.fn()}
          onSubmit={vi.fn()}
          disabled={false}
        />,
      );
      expect(screen.getByLabelText(/end/i)).toBeTruthy();
    });

    it("renders 6 event type checkboxes", () => {
      render(
        <GeneratorForm
          form={makeDefaultForm()}
          setForm={vi.fn()}
          applyPreset={vi.fn()}
          onSubmit={vi.fn()}
          disabled={false}
        />,
      );
      const checkboxes = screen.getAllByRole("checkbox");
      // At least 6 for event types (there's also identity_resolution switch)
      expect(checkboxes.length).toBeGreaterThanOrEqual(6);
    });

    it("renders identity resolution switch", () => {
      render(
        <GeneratorForm
          form={makeDefaultForm()}
          setForm={vi.fn()}
          applyPreset={vi.fn()}
          onSubmit={vi.fn()}
          disabled={false}
        />,
      );
      // MUI v9 Switch renders as input[type=checkbox] with aria-label via slotProps.input
      const switchEl = screen.getByRole("checkbox", {
        name: /identity.?resolution/i,
      });
      expect(switchEl).toBeTruthy();
    });

    it("renders anonymous ratio slider", () => {
      render(
        <GeneratorForm
          form={makeDefaultForm()}
          setForm={vi.fn()}
          applyPreset={vi.fn()}
          onSubmit={vi.fn()}
          disabled={false}
        />,
      );
      const slider = screen.getByRole("slider", { name: /anonymous.?ratio/i });
      expect(slider).toBeTruthy();
    });

    it("renders variance slider", () => {
      render(
        <GeneratorForm
          form={makeDefaultForm()}
          setForm={vi.fn()}
          applyPreset={vi.fn()}
          onSubmit={vi.fn()}
          disabled={false}
        />,
      );
      const slider = screen.getByRole("slider", { name: /numeric.?variance/i });
      expect(slider).toBeTruthy();
    });
  });

  describe("preset buttons", () => {
    it("renders 'Realistic' preset button", () => {
      render(
        <GeneratorForm
          form={makeDefaultForm()}
          setForm={vi.fn()}
          applyPreset={vi.fn()}
          onSubmit={vi.fn()}
          disabled={false}
        />,
      );
      expect(screen.getByText(/realistic/i)).toBeTruthy();
    });

    it("renders 'High volume' preset button", () => {
      render(
        <GeneratorForm
          form={makeDefaultForm()}
          setForm={vi.fn()}
          applyPreset={vi.fn()}
          onSubmit={vi.fn()}
          disabled={false}
        />,
      );
      expect(screen.getByText(/high.?volume/i)).toBeTruthy();
    });

    it("renders 'Stress test' preset button", () => {
      render(
        <GeneratorForm
          form={makeDefaultForm()}
          setForm={vi.fn()}
          applyPreset={vi.fn()}
          onSubmit={vi.fn()}
          disabled={false}
        />,
      );
      expect(screen.getByText(/stress.?test/i)).toBeTruthy();
    });

    it("clicking 'Realistic' calls applyPreset('realistic')", () => {
      const mockApplyPreset = vi.fn();
      render(
        <GeneratorForm
          form={makeDefaultForm()}
          setForm={vi.fn()}
          applyPreset={mockApplyPreset}
          onSubmit={vi.fn()}
          disabled={false}
        />,
      );
      fireEvent.click(screen.getByText(/realistic/i));
      expect(mockApplyPreset).toHaveBeenCalledWith("realistic");
    });

    it("clicking 'High volume' calls applyPreset('high-volume')", () => {
      const mockApplyPreset = vi.fn();
      render(
        <GeneratorForm
          form={makeDefaultForm()}
          setForm={vi.fn()}
          applyPreset={mockApplyPreset}
          onSubmit={vi.fn()}
          disabled={false}
        />,
      );
      fireEvent.click(screen.getByText(/high.?volume/i));
      expect(mockApplyPreset).toHaveBeenCalledWith("high-volume");
    });

    it("clicking 'Stress test' calls applyPreset('stress-test')", () => {
      const mockApplyPreset = vi.fn();
      render(
        <GeneratorForm
          form={makeDefaultForm()}
          setForm={vi.fn()}
          applyPreset={mockApplyPreset}
          onSubmit={vi.fn()}
          disabled={false}
        />,
      );
      fireEvent.click(screen.getByText(/stress.?test/i));
      expect(mockApplyPreset).toHaveBeenCalledWith("stress-test");
    });
  });

  describe("submit button", () => {
    it("submit button calls onSubmit when clicked", () => {
      const mockSubmit = vi.fn();
      render(
        <GeneratorForm
          form={makeDefaultForm()}
          setForm={vi.fn()}
          applyPreset={vi.fn()}
          onSubmit={mockSubmit}
          disabled={false}
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: /generate/i }));
      expect(mockSubmit).toHaveBeenCalledTimes(1);
    });

    it("submit button is disabled when disabled=true", () => {
      render(
        <GeneratorForm
          form={makeDefaultForm()}
          setForm={vi.fn()}
          applyPreset={vi.fn()}
          onSubmit={vi.fn()}
          disabled={true}
        />,
      );
      const btn = screen.getByRole("button", { name: /generate/i });
      expect(btn).toHaveProperty("disabled", true);
    });

    it("submit button is enabled when disabled=false", () => {
      render(
        <GeneratorForm
          form={makeDefaultForm()}
          setForm={vi.fn()}
          applyPreset={vi.fn()}
          onSubmit={vi.fn()}
          disabled={false}
        />,
      );
      const btn = screen.getByRole("button", { name: /generate/i });
      expect(btn).toHaveProperty("disabled", false);
    });
  });

  describe("anonymous ratio slider disabled state", () => {
    it("anonymous ratio slider is disabled when identity_resolution is false", () => {
      const form: GeneratorFormState = {
        ...makeDefaultForm(),
        identity_resolution: false,
        anonymous_ratio: 0,
      };
      render(
        <GeneratorForm
          form={form}
          setForm={vi.fn()}
          applyPreset={vi.fn()}
          onSubmit={vi.fn()}
          disabled={false}
        />,
      );
      const slider = screen.getByRole("slider", { name: /anonymous.?ratio/i });
      expect(slider).toHaveProperty("disabled", true);
    });

    it("anonymous ratio slider is enabled when identity_resolution is true", () => {
      render(
        <GeneratorForm
          form={makeDefaultForm()}
          setForm={vi.fn()}
          applyPreset={vi.fn()}
          onSubmit={vi.fn()}
          disabled={false}
        />,
      );
      const slider = screen.getByRole("slider", { name: /anonymous.?ratio/i });
      expect(slider).toHaveProperty("disabled", false);
    });
  });
});
