import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsSheet } from "./SettingsSheet";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({}),
}));

/**
 * 設定は2階層。1枚目は「何が設定できるか」の一覧で、選んだ束だけを見せる。
 *
 * 以前は22行を1枚に積んでいて、目的の行に着くまでスクロールで探していた。
 * ここで見るのは「一覧から始まること」「潜れること」「戻れること」の3つ。
 */
describe("SettingsSheet", () => {
  it("開いた直後は束の名前だけが並び、中の行は出ていない", () => {
    render(<SettingsSheet isOpen onClose={vi.fn()} />);

    expect(screen.getByText("舞台")).toBeInTheDocument();
    expect(screen.getByText("表示")).toBeInTheDocument();
    expect(screen.queryByText("ステージの幅")).not.toBeInTheDocument();
    expect(screen.queryByText("客席を上にする")).not.toBeInTheDocument();
  });

  it("束を押すと中の行が出て、見出しがその束の名前になる", async () => {
    const user = userEvent.setup();
    render(<SettingsSheet isOpen onClose={vi.fn()} />);

    await user.click(screen.getByText("舞台"));

    expect(screen.getByText("ステージの幅")).toBeInTheDocument();
    // 見出し(シートのラベル)も入れ替わる
    expect(screen.getByRole("dialog", { name: "舞台" })).toBeInTheDocument();
    // 他の束は出ていない
    expect(screen.queryByText("客席の向き・新しい作品の広さ")).toBeNull();
  });

  it("戻るで一覧へ戻る", async () => {
    const user = userEvent.setup();
    render(<SettingsSheet isOpen onClose={vi.fn()} />);

    await user.click(screen.getByText("再生"));
    expect(screen.getByText("既定の速さ")).toBeInTheDocument();

    await user.click(screen.getByLabelText("戻る"));

    expect(screen.getByText("舞台")).toBeInTheDocument();
    expect(screen.queryByText("既定の速さ")).not.toBeInTheDocument();
  });

  // 探すために開いた人が、前に見ていた束に戻されると探し直せない
  it("開き直すと、前に見ていた束ではなく一覧から始まる", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<SettingsSheet isOpen onClose={vi.fn()} />);

    await user.click(screen.getByText("アプリ"));
    expect(screen.getByText("自動保存")).toBeInTheDocument();

    rerender(<SettingsSheet isOpen={false} onClose={vi.fn()} />);
    rerender(<SettingsSheet isOpen onClose={vi.fn()} />);

    expect(screen.getByText("舞台")).toBeInTheDocument();
    expect(screen.queryByText("自動保存")).not.toBeInTheDocument();
  });

  // 書き出し・取り込みは作品を開いているときだけの操作。ホームでは
  // 束そのものを出さない(開いても何も無い羽を見せない)
  it("作品を開いていなければ「データ」の束を出さない", () => {
    const { rerender } = render(<SettingsSheet isOpen onClose={vi.fn()} />);
    expect(screen.queryByText("データ")).not.toBeInTheDocument();

    rerender(
      <SettingsSheet isOpen onClose={vi.fn()} onExport={vi.fn()} />,
    );
    expect(screen.getByText("データ")).toBeInTheDocument();
  });
});
