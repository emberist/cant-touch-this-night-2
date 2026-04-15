// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { JsonChip } from "@/components/ui/JsonChip";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("JsonChip", () => {
  describe("empty / no-properties state", () => {
    it("renders 'No properties' for an empty JSON object", () => {
      render(<JsonChip properties="{}" />);
      expect(screen.getByText("No properties")).toBeTruthy();
    });

    it("renders 'No properties' for an empty string", () => {
      render(<JsonChip properties="" />);
      expect(screen.getByText("No properties")).toBeTruthy();
    });
  });

  describe("with properties", () => {
    it("renders a chip (button) with truncated key preview for JSON with multiple keys", () => {
      render(
        <JsonChip properties='{"page":"/home","user":"alice","count":3}' />,
      );
      // The chip should be clickable (role=button) and show a short preview of keys
      const chip = screen.getByRole("button");
      expect(chip).toBeTruthy();
      // Preview text should include key names, not the raw JSON values
      const text = chip.textContent ?? "";
      expect(text).not.toBe("");
      // Should not show the full stringified JSON in preview
      expect(text).not.toContain('"page":"/home"');
    });

    it("chip preview includes the first key name", () => {
      render(<JsonChip properties='{"amount":49.99,"currency":"USD"}' />);
      const chip = screen.getByRole("button");
      expect(chip.textContent).toContain("amount");
    });

    it("does not render 'No properties' when properties are present", () => {
      render(<JsonChip properties='{"x":1}' />);
      expect(screen.queryByText("No properties")).toBeNull();
    });
  });

  describe("expansion", () => {
    it("clicking the chip reveals the full JSON content", () => {
      render(<JsonChip properties='{"page":"/home","user":"alice"}' />);
      const chip = screen.getByRole("button");
      fireEvent.click(chip);
      // After expansion, the formatted JSON should be visible in the document
      const expanded = screen.getByText(/\/home/);
      expect(expanded).toBeTruthy();
    });

    it("full JSON is not visible before clicking", () => {
      render(<JsonChip properties='{"secretKey":"hunter2"}' />);
      expect(screen.queryByText(/hunter2/)).toBeNull();
    });
  });
});
