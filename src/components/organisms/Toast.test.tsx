import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Toast } from "./Toast";
import { useUIStore } from "@/features/canvas/store/useUIStore";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  useUIStore.setState({
    selectedSceneId: null,
    selectedDancerId: null,
    isGridVisible: true,
    draggingDancerId: null,
    toast: null,
    isSymmetryMode: false,
    focusedDancerId: null,
    isPathVisible: false,
    isBlindSpotCheckVisible: false,
  });
});

describe("Toast", () => {
  it("toastが無ければ何も表示しない", () => {
    render(<Toast />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("toastがあればメッセージを表示する", () => {
    useUIStore.setState({ toast: { message: "保存しました", type: "success" } });
    render(<Toast />);
    expect(screen.getByRole("status")).toHaveTextContent("保存しました");
  });

  it("一定時間後に自動でtoastを消す", () => {
    useUIStore.setState({ toast: { message: "失敗しました", type: "error" } });
    render(<Toast />);

    vi.advanceTimersByTime(4000);

    expect(useUIStore.getState().toast).toBeNull();
  });
});
