import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmDialog } from "./ConfirmDialog";
import {
  useUIStore,
  type ConfirmRequest,
} from "@/features/canvas/store/useUIStore";

function openDialog(overrides: Partial<ConfirmRequest> = {}) {
  useUIStore.getState().requestConfirm({
    title: "「サビ入り」を削除しますか?",
    description: "このシーンの配置と、ここへ入る導線も一緒に消えます。",
    meta: ["6 人の配置"],
    onConfirm: vi.fn(),
    ...overrides,
  });
}


describe("ConfirmDialog", () => {
  it("確認の要求が無ければ何も表示しない", () => {
    render(<ConfirmDialog />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("見出し・説明・巻き添えになるものを表示する", () => {
    openDialog();
    render(<ConfirmDialog />);

    expect(screen.getByText("「サビ入り」を削除しますか?")).toBeInTheDocument();
    expect(
      screen.getByText("このシーンの配置と、ここへ入る導線も一緒に消えます。"),
    ).toBeInTheDocument();
    expect(screen.getByText("6 人の配置")).toBeInTheDocument();
  });

  it("『削除する』でonConfirmを呼び、閉じる", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    openDialog({ onConfirm });
    render(<ConfirmDialog />);

    await user.click(screen.getByRole("button", { name: "削除する" }));

    expect(onConfirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(useUIStore.getState().confirm).toBeNull();
    });
  });

  it("『キャンセル』ではonConfirmを呼ばずに閉じる", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    openDialog({ onConfirm });
    render(<ConfirmDialog />);

    await user.click(screen.getByRole("button", { name: "キャンセル" }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(useUIStore.getState().confirm).toBeNull();
  });

  it("Escapeで閉じる", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    openDialog({ onConfirm });
    render(<ConfirmDialog />);

    await user.keyboard("{Escape}");

    expect(onConfirm).not.toHaveBeenCalled();
    expect(useUIStore.getState().confirm).toBeNull();
  });

  it("実行ボタンの文言を差し替えられる", () => {
    openDialog({ confirmLabel: "破棄する" });
    render(<ConfirmDialog />);

    expect(
      screen.getByRole("button", { name: "破棄する" }),
    ).toBeInTheDocument();
  });

  it("実行中は両方のボタンを無効にする(二度押しで2回削除しないため)", async () => {
    let resolveConfirm = () => {};
    const onConfirm = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveConfirm = resolve;
        }),
    );
    const user = userEvent.setup();
    openDialog({ onConfirm });
    render(<ConfirmDialog />);

    await user.click(screen.getByRole("button", { name: "削除する" }));

    expect(screen.getByRole("button", { name: "削除中..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "キャンセル" })).toBeDisabled();

    resolveConfirm();
    await waitFor(() => {
      expect(useUIStore.getState().confirm).toBeNull();
    });
  });
});
