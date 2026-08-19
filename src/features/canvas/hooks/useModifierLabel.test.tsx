import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { useModifierLabel } from "@/features/canvas/hooks/useModifierLabel";

function Probe() {
  return <span data-testid="label">{useModifierLabel()}</span>;
}

afterEach(() => vi.restoreAllMocks());

describe("useModifierLabel", () => {
  it("Mac では ⌘", () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    );
    render(<Probe />);
    expect(screen.getByTestId("label").textContent).toBe("⌘");
  });

  it("それ以外は Ctrl", () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    );
    render(<Probe />);
    expect(screen.getByTestId("label").textContent).toBe("Ctrl");
  });
});
