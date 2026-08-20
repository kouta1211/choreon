import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { Toast } from "./Toast";
import { useUIStore } from "@/features/canvas/store/useUIStore";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Toast", () => {
  it("toastが無ければ何も表示しない", () => {
    render(<Toast />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("toastがあればメッセージを表示する", () => {
    useUIStore.setState({
      toast: { message: "保存しました", type: "success" },
    });
    render(<Toast />);
    expect(screen.getByRole("status")).toHaveTextContent("保存しました");
  });

  /* 2段構え。まず薄くし始めて、消えきってから捨てる。
     いきなり捨てると、薄くなる途中が描かれない（実機の要望 2026-08-20） */
  it("一定時間で薄くなり始め、消えきってから捨てる", () => {
    useUIStore.setState({ toast: { message: "失敗しました", type: "error" } });
    render(<Toast />);

    act(() => vi.advanceTimersByTime(4000));

    // まだ画面には居る。ただし透明へ向かっている
    const banner = screen.getByRole("status");
    expect(banner).toBeInTheDocument();
    expect(banner.style.opacity).toBe("0");
    expect(useUIStore.getState().toast).not.toBeNull();

    act(() => vi.advanceTimersByTime(320));

    expect(useUIStore.getState().toast).toBeNull();
  });
});
