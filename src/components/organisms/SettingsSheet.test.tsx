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

    expect(screen.getByText("表示")).toBeInTheDocument();
    expect(screen.getByText("再生")).toBeInTheDocument();
    expect(screen.queryByText("客席を上にする")).not.toBeInTheDocument();
    expect(screen.queryByText("既定の速さ")).not.toBeInTheDocument();
  });

  it("束を押すと中の行が出て、見出しがその束の名前になる", async () => {
    const user = userEvent.setup();
    render(<SettingsSheet isOpen onClose={vi.fn()} />);

    await user.click(screen.getByText("表示"));

    expect(screen.getByText("客席を上にする")).toBeInTheDocument();
    // 見出し(シートのラベル)も入れ替わる
    expect(screen.getByRole("dialog", { name: "表示" })).toBeInTheDocument();
    // 他の束は出ていない
    expect(screen.queryByText("既定の速さ")).toBeNull();
  });

  /* ホームには広さを変える相手が居ない。作るときの板で決める形にした
     ので、初期値の束ごと外した（2026-08-20） */
  it("作品を開いていなければ「舞台」の束を出さない", () => {
    render(<SettingsSheet isOpen onClose={vi.fn()} />);

    expect(screen.queryByText("舞台")).toBeNull();
    expect(screen.queryByText("ステージの幅")).toBeNull();
  });

  it("戻るで一覧へ戻る", async () => {
    const user = userEvent.setup();
    render(<SettingsSheet isOpen onClose={vi.fn()} />);

    await user.click(screen.getByText("再生"));
    expect(screen.getByText("既定の速さ")).toBeInTheDocument();

    await user.click(screen.getByLabelText("戻る"));

    expect(screen.getByText("表示")).toBeInTheDocument();
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

    expect(screen.getByText("表示")).toBeInTheDocument();
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
    // 狭めたら何が起きるかを先に書いてある
    expect(screen.getByText(/8×6 マスより狭くすると/)).toBeInTheDocument();
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

  /* **止めるのをやめた**（実機報告 03-6）。狭める方を優先して、収まらない
     人はいちばん近い端へ寄せる。戻せるように履歴へ積んである */
  it("外に人が出る狭さでも通し、その人を端へ寄せる", async () => {
    openProject();
    const user = await openStage();

    const depth = screen.getByLabelText(/ステージの奥行き/);
    await user.clear(depth);
    await user.type(depth, "5");
    await user.click(screen.getByRole("button", { name: /適用/ }));

    const store = useProjectStore.getState();
    expect(store.project?.stageHeight).toBe(5);
    // 6 に居た人が、新しい奥行き(5)の端へ
    expect(store.positionsBySceneId["scene-1"]["dancer-1"].yCoordinate).toBe(5);
    // 横は動かない
    expect(store.positionsBySceneId["scene-1"]["dancer-1"].xCoordinate).toBe(8);
  });

  /* 押せないようにしておかないと、押してから直すことになる（12-9） */
  it("入れられる範囲の外を打っている間は「適用」を押せない", async () => {
    openProject();
    const user = await openStage();

    const width = screen.getByLabelText(/ステージの幅/);
    await user.clear(width);
    await user.type(width, "999");

    expect(screen.getByRole("button", { name: /適用|範囲/ })).toBeDisabled();
    expect(screen.getByText(/30 より大きくはできません/)).toBeInTheDocument();

    // 範囲の中へ直すと押せるようになる
    await user.clear(width);
    await user.type(width, "20");
    expect(screen.getByRole("button", { name: /適用/ })).toBeEnabled();
  });

  // スイッチだけの束に、押しても何も起きないボタンを常設しない
  it("数を入れる行が無い束には「適用」を出さない", async () => {
    openProject();
    const user = userEvent.setup();
    render(<SettingsSheet isOpen onClose={vi.fn()} />);

    await user.click(screen.getByText("目盛り"));
    expect(screen.queryByRole("button", { name: /適用/ })).toBeNull();

    await user.click(screen.getByLabelText("戻る"));
    await user.click(screen.getByText("舞台"));
    expect(screen.getByRole("button", { name: /適用/ })).toBeInTheDocument();
  });
});

/**
 * 並びは【触る回数の多い順】（2026-08-20）。
 *
 * 上から「いま画面に見えているもの → この作品のこと → 道具 → アプリの
 * こと」で、**壊せるもの（データ・アカウント）はいちばん下**。
 * 束を足すときに、この順を崩していないかをここで見る。
 */
describe("SettingsSheet の並び", () => {
  /** 画面に出ている順で、渡した言葉の位置を返す */
  function orderOf(container: HTMLElement, labels: string[]) {
    const text = container.textContent ?? "";
    return labels.map((label) => text.indexOf(label));
  }

  it("ホームでは、よく触る束が上に来る", () => {
    const { container } = render(<SettingsSheet isOpen onClose={vi.fn()} />);

    const found = orderOf(container, [
      "表示",
      "目盛り",
      "再生",
      "キーボード操作",
      "アプリ",
      "アカウント",
    ]);

    expect(found.every((index) => index >= 0)).toBe(true);
    expect([...found].sort((a, b) => a - b)).toEqual(found);
  });

  it("作品を開いているときは、舞台が再生の次に入る", () => {
    useProjectStore.setState({
      isGuest: true,
      project: makeProject(),
    });
    const { container } = render(<SettingsSheet isOpen onClose={vi.fn()} />);

    const found = orderOf(container, ["再生", "舞台", "キーボード操作"]);

    expect(found.every((index) => index >= 0)).toBe(true);
    expect([...found].sort((a, b) => a - b)).toEqual(found);
  });

  /* 客席の向きは1回決めたら二度と変えない人が多いので、いちばん下。
     上に置くと、毎回それを跨いで下の行へ行くことになる */
  it("「表示」の中も、よく触る行が上に来る", async () => {
    const user = userEvent.setup();
    const { container } = render(<SettingsSheet isOpen onClose={vi.fn()} />);

    await user.click(screen.getByText("表示"));
    const found = orderOf(container, [
      "ダンサー名",
      "導線",
      "顔被りチェック",
      "バミリ",
      "客席を上にする",
    ]);

    expect(found.every((index) => index >= 0)).toBe(true);
    expect([...found].sort((a, b) => a - b)).toEqual(found);
  });
});
