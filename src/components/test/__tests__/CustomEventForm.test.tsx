// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CustomEventForm } from "@/components/test/CustomEventForm";
import type {
  EventPayload,
  SendResult,
} from "@/components/test/useEventSender";

// ─── Setup ────────────────────────────────────────────────────────────────────

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function openForm() {
  const toggle = screen.getByRole("button", { name: /custom event/i });
  fireEvent.click(toggle);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("CustomEventForm", () => {
  describe("container", () => {
    it("renders data-testid='custom-event-form' container", () => {
      render(<CustomEventForm sendEvent={vi.fn()} />);
      expect(screen.getByTestId("custom-event-form")).toBeTruthy();
    });
  });

  describe("collapsible", () => {
    it("form fields are not visible initially (collapsed)", () => {
      render(<CustomEventForm sendEvent={vi.fn()} />);
      expect(
        screen.queryByRole("textbox", { name: /event.?name/i }),
      ).toBeNull();
    });

    it("form fields become visible after toggling open", () => {
      render(<CustomEventForm sendEvent={vi.fn()} />);
      openForm();
      expect(
        screen.getByRole("textbox", { name: /event.?name/i }),
      ).toBeTruthy();
    });

    it("form fields are hidden again after toggling closed", () => {
      render(<CustomEventForm sendEvent={vi.fn()} />);
      openForm();
      const toggle = screen.getByRole("button", { name: /custom event/i });
      fireEvent.click(toggle);
      expect(
        screen.queryByRole("textbox", { name: /event.?name/i }),
      ).toBeNull();
    });
  });

  describe("submit button state", () => {
    it("submit button is disabled when event_name is empty", () => {
      render(<CustomEventForm sendEvent={vi.fn()} />);
      openForm();
      const submitBtn = screen.getByRole("button", { name: /^send$/i });
      expect(submitBtn).toHaveProperty("disabled", true);
    });

    it("submit button is enabled when event_name has a value", () => {
      render(<CustomEventForm sendEvent={vi.fn()} />);
      openForm();
      const input = screen.getByRole("textbox", { name: /event.?name/i });
      fireEvent.change(input, { target: { value: "Page Viewed" } });
      const submitBtn = screen.getByRole("button", { name: /^send$/i });
      expect(submitBtn).toHaveProperty("disabled", false);
    });
  });

  describe("form submission", () => {
    it("calls sendEvent with event_name when submitted", async () => {
      const mockSendEvent = vi
        .fn<(payload: EventPayload) => Promise<SendResult>>()
        .mockResolvedValue({ success: true });
      render(<CustomEventForm sendEvent={mockSendEvent} />);
      openForm();

      fireEvent.change(screen.getByRole("textbox", { name: /event.?name/i }), {
        target: { value: "Page Viewed" },
      });
      fireEvent.click(screen.getByRole("button", { name: /^send$/i }));

      await waitFor(() => expect(mockSendEvent).toHaveBeenCalledTimes(1));
      expect(
        (mockSendEvent.mock.calls[0] as [EventPayload])[0].event_name,
      ).toBe("Page Viewed");
    });

    it("includes device_id in payload when filled", async () => {
      const mockSendEvent = vi
        .fn<(payload: EventPayload) => Promise<SendResult>>()
        .mockResolvedValue({ success: true });
      render(<CustomEventForm sendEvent={mockSendEvent} />);
      openForm();

      fireEvent.change(screen.getByRole("textbox", { name: /event.?name/i }), {
        target: { value: "Page Viewed" },
      });
      fireEvent.change(screen.getByRole("textbox", { name: /device.?id/i }), {
        target: { value: "dev-xyz" },
      });
      fireEvent.click(screen.getByRole("button", { name: /^send$/i }));

      await waitFor(() => expect(mockSendEvent).toHaveBeenCalledTimes(1));
      expect((mockSendEvent.mock.calls[0] as [EventPayload])[0].device_id).toBe(
        "dev-xyz",
      );
    });

    it("includes user_id in payload when filled", async () => {
      const mockSendEvent = vi
        .fn<(payload: EventPayload) => Promise<SendResult>>()
        .mockResolvedValue({ success: true });
      render(<CustomEventForm sendEvent={mockSendEvent} />);
      openForm();

      fireEvent.change(screen.getByRole("textbox", { name: /event.?name/i }), {
        target: { value: "Purchase Completed" },
      });
      fireEvent.change(screen.getByRole("textbox", { name: /user.?id/i }), {
        target: { value: "user@test.com" },
      });
      fireEvent.click(screen.getByRole("button", { name: /^send$/i }));

      await waitFor(() => expect(mockSendEvent).toHaveBeenCalledTimes(1));
      expect((mockSendEvent.mock.calls[0] as [EventPayload])[0].user_id).toBe(
        "user@test.com",
      );
    });

    it("includes parsed JSON properties in payload when filled with valid JSON", async () => {
      const mockSendEvent = vi
        .fn<(payload: EventPayload) => Promise<SendResult>>()
        .mockResolvedValue({ success: true });
      render(<CustomEventForm sendEvent={mockSendEvent} />);
      openForm();

      fireEvent.change(screen.getByRole("textbox", { name: /event.?name/i }), {
        target: { value: "Purchase Completed" },
      });
      // Properties field is a textarea
      const propsField = screen.getByRole("textbox", { name: /properties/i });
      fireEvent.change(propsField, {
        target: { value: '{"amount": 49.99, "currency": "USD"}' },
      });
      fireEvent.click(screen.getByRole("button", { name: /^send$/i }));

      await waitFor(() => expect(mockSendEvent).toHaveBeenCalledTimes(1));
      expect(
        (mockSendEvent.mock.calls[0] as [EventPayload])[0].properties,
      ).toEqual({ amount: 49.99, currency: "USD" });
    });

    it("shows validation error for invalid JSON in properties field", () => {
      render(<CustomEventForm sendEvent={vi.fn()} />);
      openForm();

      fireEvent.change(screen.getByRole("textbox", { name: /event.?name/i }), {
        target: { value: "Page Viewed" },
      });
      const propsField = screen.getByRole("textbox", { name: /properties/i });
      fireEvent.change(propsField, { target: { value: "{invalid json}" } });

      // Multiple DOM nodes may contain the helper text — check at least one exists
      expect(screen.queryAllByText(/invalid json/i).length).toBeGreaterThan(0);
    });
  });

  describe("feedback", () => {
    it("displays success feedback after a successful send", async () => {
      const mockSendEvent = vi.fn().mockResolvedValue({ success: true });
      render(<CustomEventForm sendEvent={mockSendEvent} />);
      openForm();

      fireEvent.change(screen.getByRole("textbox", { name: /event.?name/i }), {
        target: { value: "Page Viewed" },
      });
      fireEvent.click(screen.getByRole("button", { name: /^send$/i }));

      await waitFor(() => {
        expect(screen.queryByText(/sent|success/i)).toBeTruthy();
      });
    });

    it("displays error feedback when send fails", async () => {
      const mockSendEvent = vi
        .fn()
        .mockResolvedValue({ success: false, error: "Server error" });
      render(<CustomEventForm sendEvent={mockSendEvent} />);
      openForm();

      fireEvent.change(screen.getByRole("textbox", { name: /event.?name/i }), {
        target: { value: "Page Viewed" },
      });
      fireEvent.click(screen.getByRole("button", { name: /^send$/i }));

      await waitFor(() => {
        expect(screen.queryByText(/error|failed/i)).toBeTruthy();
      });
    });
  });
});
