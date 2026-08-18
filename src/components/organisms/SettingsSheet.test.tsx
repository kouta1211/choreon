import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsSheet } from "./SettingsSheet";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import {
  makeDancer,
  makePosition,
  makeProject,
  makeScene,
} from "@/test/factories";

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

/**
 * 「舞台」の広さが**どの作品を指すか**は、開いた場所で変わる。
 *
 * ホームからなら【これから作る作品の初期値】、作品を開いた状態なら
 * 【その作品の広さ】。以前は別々の束に分けていたが、同じ画面に「幅」が
 * 2つ並んで、どちらが効くのか読めなかった（実機報告 03-17）。
 *
 * 確定は行ごとのボタンではなく、束の下に1つ常設した「適用」がまとめて行う。
 * **まとめて押したときに片方が消えないこと**が、ここでいちばん大事。
 */
describe("SettingsSheet の「舞台」", () => {
  /** ゲストの下書きとして入れる。persist() がゲストを見て保存を止めるので、
   *  ここでは Supabase を触らずに済む */
  const openProject = () =>
    useProjectStore.setState({
      isGuest: true,
      project: makeProject({ stageWidth: 15, stageHeight: 10 }),
      dancers: { "dancer-1": makeDancer() },
      scenes: [makeScene()],
      positionsBySceneId: {
        "scene-1": {
          "dancer-1": makePosition({ xCoordinate: 8, yCoordinate: 6 }),
        },
      },
    });

  const openStage = async () => {
    const user = userEvent.setup();
    render(<SettingsSheet isOpen onClose={vi.fn()} />);
    await user.click(screen.getByText("舞台"));
    return user;
  };

  it("作品を開いていると、その作品の広さが入っている", async () => {
    openProject();
    await openStage();

    expect(screen.getByLabelText(/ステージの幅/)).toHaveValue(15);
    expect(screen.getByLabelText(/ステージの奥行き/)).toHaveValue(10);
    // どこまで狭められるかも添える
    expect(screen.getByText(/8×6 マスまで/)).toBeInTheDocument();
  });

  it("打っただけでは変わらない。「適用」を押して初めて効く", async () => {
    openProject();
    const user = await openStage();

    const width = screen.getByLabelText(/ステージの幅/);
    await user.clear(width);
    await user.type(width, "20");
    expect(useProjectStore.getState().project?.stageWidth).toBe(15);

    await user.click(screen.getByRole("button", { name: /適用/ }));
    expect(useProjectStore.getState().project?.stageWidth).toBe(20);
  });

  // 2つの確定が同じ瞬間に走る。描画時の写しを見ていると、後から走った方が
  // 先の変更を消してしまう(幅を変えたのに元へ戻る)
  it("幅と奥行きを両方打ってから押しても、片方が消えない", async () => {
    openProject();
    const user = await openStage();

    const width = screen.getByLabelText(/ステージの幅/);
    const depth = screen.getByLabelText(/ステージの奥行き/);
    await user.clear(width);
    await user.type(width, "20");
    await user.clear(depth);
    await user.type(depth, "12");

    await user.click(screen.getByRole("button", { name: /適用/ }));

    const project = useProjectStore.getState().project;
    expect(project?.stageWidth).toBe(20);
    expect(project?.stageHeight).toBe(12);
  });

  it("外に人が出る狭さは断って、欄の数も元へ戻す", async () => {
    openProject();
    const user = await openStage();

    const depth = screen.getByLabelText(/ステージの奥行き/);
    await user.clear(depth);
    await user.type(depth, "5");
    await user.click(screen.getByRole("button", { name: /適用/ }));

    expect(useProjectStore.getState().project?.stageHeight).toBe(10);
    expect(depth).toHaveValue(10);
    expect(screen.getByText(/1人がその外に居る/)).toBeInTheDocument();
  });

  // スイッチだけの束に、押しても何も起きないボタンを常設しない
  it("数を入れる行が無い束には「適用」を出さない", async () => {
    const user = userEvent.setup();
    render(<SettingsSheet isOpen onClose={vi.fn()} />);

    await user.click(screen.getByText("目盛り"));
    expect(screen.queryByRole("button", { name: /適用/ })).toBeNull();

    await user.click(screen.getByLabelText("戻る"));
    await user.click(screen.getByText("舞台"));
    expect(screen.getByRole("button", { name: /適用/ })).toBeInTheDocument();
  });
});
