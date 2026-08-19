import { afterEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ShortcutsDialog } from "./ShortcutsDialog";
import { LocaleProvider } from "@/features/i18n/LocaleProvider";
import { useUIStore } from "@/features/canvas/store/useUIStore";

function show() {
  render(
    <LocaleProvider locale="ja">
      <ShortcutsDialog />
    </LocaleProvider>,
  );
}

afterEach(() => useUIStore.setState({ isShortcutsOpen: false }));

describe("ShortcutsDialog", () => {
  it("閉じている間は何も描かない", () => {
    show();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("開くと、一覧の中身がそのまま出る", () => {
    useUIStore.setState({ isShortcutsOpen: true });
    show();

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("再生 / 停止")).toBeInTheDocument();
  });
});
