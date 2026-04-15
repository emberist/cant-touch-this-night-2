// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QuickFireButtons } from "@/components/test/QuickFireButtons";

// ─── Setup ────────────────────────────────────────────────────────────────────

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
  mockFetch.mockResolvedValue({
    ok: true,
    status: 201,
    json: () => Promise.resolve({}),
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("QuickFireButtons", () => {
  describe("container", () => {
    it("renders data-testid='quick-fire-buttons' container", () => {
      render(<QuickFireButtons />);
      expect(screen.getByTestId("quick-fire-buttons")).toBeTruthy();
    });
  });

  describe("buttons rendered", () => {
    it("renders all 5 quick-fire buttons", () => {
      render(<QuickFireButtons />);
      expect(
        screen.getByRole("button", { name: /anonymous page view/i }),
      ).toBeTruthy();
      expect(
        screen.getByRole("button", { name: /button click/i }),
      ).toBeTruthy();
      expect(
        screen.getByRole("button", { name: /identify user/i }),
      ).toBeTruthy();
      expect(screen.getByRole("button", { name: /purchase/i })).toBeTruthy();
      expect(screen.getByRole("button", { name: /signup/i })).toBeTruthy();
    });
  });

  describe("Anonymous Page View button", () => {
    it("sends event_name 'Page Viewed', a device_id, and page '/home'", async () => {
      render(<QuickFireButtons />);
      fireEvent.click(
        screen.getByRole("button", { name: /anonymous page view/i }),
      );

      await waitFor(() =>
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/events",
          expect.anything(),
        ),
      );

      const body = JSON.parse(
        (mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string,
      ) as Record<string, unknown>;
      expect(body.event_name).toBe("Page Viewed");
      expect(body.device_id).toBeTruthy();
      expect(body.user_id).toBeUndefined();
      expect((body.properties as Record<string, unknown>)?.page).toBe("/home");
    });
  });

  describe("Button Click button", () => {
    it("sends event_name 'Button Clicked' with the same device_id as the last Anonymous Page View", async () => {
      render(<QuickFireButtons />);

      // Step 1: fire Anonymous Page View to set lastDeviceId
      fireEvent.click(
        screen.getByRole("button", { name: /anonymous page view/i }),
      );
      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

      const firstBody = JSON.parse(
        (mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string,
      ) as Record<string, unknown>;
      const firstDeviceId = firstBody.device_id as string;
      expect(firstDeviceId).toBeTruthy();

      // Step 2: fire Button Click — should use the same device_id
      fireEvent.click(screen.getByRole("button", { name: /button click/i }));
      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));

      const secondBody = JSON.parse(
        (mockFetch.mock.calls[1] as [string, RequestInit])[1].body as string,
      ) as Record<string, unknown>;
      expect(secondBody.event_name).toBe("Button Clicked");
      expect(secondBody.device_id).toBe(firstDeviceId);
    });
  });

  describe("Identify User button", () => {
    it("sends the last anonymous device_id and user_id 'test@example.com'", async () => {
      render(<QuickFireButtons />);

      // Set lastDeviceId via Anonymous Page View
      fireEvent.click(
        screen.getByRole("button", { name: /anonymous page view/i }),
      );
      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

      const firstBody = JSON.parse(
        (mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string,
      ) as Record<string, unknown>;
      const firstDeviceId = firstBody.device_id as string;

      // Identify User
      fireEvent.click(screen.getByRole("button", { name: /identify user/i }));
      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));

      const identifyBody = JSON.parse(
        (mockFetch.mock.calls[1] as [string, RequestInit])[1].body as string,
      ) as Record<string, unknown>;
      expect(identifyBody.device_id).toBe(firstDeviceId);
      expect(identifyBody.user_id).toBe("test@example.com");
    });
  });

  describe("Purchase button", () => {
    it("sends event_name 'Purchase Completed' with user_id and amount/currency", async () => {
      render(<QuickFireButtons />);
      fireEvent.click(screen.getByRole("button", { name: /purchase/i }));

      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

      const body = JSON.parse(
        (mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string,
      ) as Record<string, unknown>;
      expect(body.event_name).toBe("Purchase Completed");
      expect(body.user_id).toBe("test@example.com");

      const props = body.properties as Record<string, unknown>;
      expect(props.amount).toBe(49.99);
      expect(props.currency).toBe("USD");
    });
  });

  describe("Signup button", () => {
    it("sends event_name 'Signup Completed' with a new random device_id and user_id", async () => {
      render(<QuickFireButtons />);
      fireEvent.click(screen.getByRole("button", { name: /signup/i }));

      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

      const body = JSON.parse(
        (mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string,
      ) as Record<string, unknown>;
      expect(body.event_name).toBe("Signup Completed");
      expect(body.device_id).toBeTruthy();
      expect(body.user_id).toBeTruthy();
    });

    it("generates a different device_id and user_id each time", async () => {
      render(<QuickFireButtons />);

      fireEvent.click(screen.getByRole("button", { name: /signup/i }));
      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

      fireEvent.click(screen.getByRole("button", { name: /signup/i }));
      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));

      const body1 = JSON.parse(
        (mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string,
      ) as Record<string, unknown>;
      const body2 = JSON.parse(
        (mockFetch.mock.calls[1] as [string, RequestInit])[1].body as string,
      ) as Record<string, unknown>;

      expect(body1.device_id).not.toBe(body2.device_id);
      expect(body1.user_id).not.toBe(body2.user_id);
    });
  });

  describe("feedback", () => {
    it("displays success feedback after a successful send", async () => {
      render(<QuickFireButtons />);
      fireEvent.click(
        screen.getByRole("button", { name: /anonymous page view/i }),
      );

      await waitFor(() => {
        const text = screen.queryByText(/sent|success/i);
        expect(text).toBeTruthy();
      });
    });

    it("displays error feedback when the send fails", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: "Server error" }),
      });

      render(<QuickFireButtons />);
      fireEvent.click(
        screen.getByRole("button", { name: /anonymous page view/i }),
      );

      await waitFor(() => {
        const text = screen.queryByText(/error|failed/i);
        expect(text).toBeTruthy();
      });
    });
  });
});
