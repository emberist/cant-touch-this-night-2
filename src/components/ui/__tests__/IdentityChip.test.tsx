// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Mock next/link to avoid Next.js router context requirement in tests
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    style,
  }: {
    children: React.ReactNode;
    href: string;
    style?: React.CSSProperties;
  }) => (
    <a href={href} style={style}>
      {children}
    </a>
  ),
}));

import { IdentityChip } from "@/components/ui/IdentityChip";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("IdentityChip", () => {
  it("renders the resolved_id text", () => {
    render(<IdentityChip resolved_id="user@test.com" />);
    expect(screen.getByText("user@test.com")).toBeTruthy();
  });

  it("wraps content in a link element", () => {
    render(<IdentityChip resolved_id="user@test.com" />);
    const link = screen.getByRole("link");
    expect(link).toBeTruthy();
  });

  it("links to /users/[percent-encoded id]", () => {
    render(<IdentityChip resolved_id="user@test.com" />);
    const link = screen.getByRole("link");
    // @ must be percent-encoded
    expect(link.getAttribute("href")).toBe(
      `/users/${encodeURIComponent("user@test.com")}`,
    );
  });

  it("handles special characters in resolved_id (URL encoding)", () => {
    const id = "user+special@example.com/path?q=1";
    render(<IdentityChip resolved_id={id} />);
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe(`/users/${encodeURIComponent(id)}`);
  });

  it("renders the resolved_id as the chip label", () => {
    const id = "device-abc-123";
    render(<IdentityChip resolved_id={id} />);
    expect(screen.getByText(id)).toBeTruthy();
  });
});
