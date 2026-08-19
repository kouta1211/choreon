import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ShortcutsDialog } from "./ShortcutsDialog";
import { LocaleProvider } from "@/features/i18n/LocaleProvider";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { NUDGE_STEP_SMALL } from "@/features/canvas/lib/nudgeKey";

function show() {
  render(
    <LocaleProvider locale="ja">
      <ShortcutsDialog />
    </LocaleProvider>,
  );
}

function pretendPlatform(userAgent: string) {
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue(userAgent);
}

afterEach(() => {
  useUIStore.setState({ isShortcutsOpen: false });
  vi.restoreAllMocks();
});

describe("ShortcutsDialog", () => {
  it("閉じている間は何も描かない", () => {
    show();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("開くと、組ごとに操作が並ぶ", () => {
    useUIStore.setState({ isShortcutsOpen: true });
    show();

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("再生 / 停止")).toBeInTheDocument();
    expect(
      screen.getByText("そのシーンに立っている全員を選ぶ"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("向き・整列・削除のメニューを出す"),
    ).toBeInTheDocument();
  });

  /* 動く量は定数から。ここを文字で書くと、刻みを変えたとき一覧だけ古くなる */
  it("矢印キーの移動量は、実際の刻みで出る", () => {
    useUIStore.setState({ isShortcutsOpen: true });
    show();
    expect(
      screen.getByText(`${NUDGE_STEP_SMALL} マスずつ動かす`),
    ).toBeInTheDocument();
  });

  it("Windows では Ctrl と書く", () => {
    pretendPlatform("Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
    useUIStore.setState({ isShortcutsOpen: true });
    show();
    expect(screen.getAllByText("Ctrl").length).toBeGreaterThan(0);
    expect(screen.queryByText("⌘")).toBeNull();
  });

  it("Mac では ⌘ と書く", () => {
    pretendPlatform("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)");
    useUIStore.setState({ isShortcutsOpen: true });
    show();
    expect(screen.getAllByText("⌘").length).toBeGreaterThan(0);
    expect(screen.queryByText("Ctrl")).toBeNull();
  });
});
