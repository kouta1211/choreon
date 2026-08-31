import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SceneList } from "./SceneList";
import { ConfirmDialog } from "@/components/organisms/ConfirmDialog";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import * as scenesApi from "@/features/scene/api/scenes";

import { makeProject, makeScene } from "@/test/factories";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({}),
}));

const SCENES = [
  makeScene({ timeSeconds: 0 }),
  makeScene({ id: "scene-2", name: "シーン2", orderIndex: 1, timeSeconds: 2 }),
];

afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * カードのどこを押したら何が起きるか。
 *
 * 以前はミニチュア(SceneThumbnail)だけが押せて、幅いっぱいのカードのうち
 * 左端の小さな四角しか反応しなかった。カード全体を押せるようにしたぶん、
 * 中の操作ボタンまで「選択」に飲み込まれていないかを一緒に確かめる。
 */
describe("SceneList", () => {
  /* カウントの欄は**どの作品にも出る**（2026-08-26 に「順番だけ」の
     モードを畳んだ）。BPM 120 なので 1拍 0.5秒 = 1カウント */
  beforeEach(() => {
    useProjectStore.setState({
      project: makeProject({ isMetronomeEnabled: true }),
    });
  });

  it("カードのシーン名を押すと、そのシーンに切り替わる", async () => {
    useProjectStore.setState({ scenes: SCENES });
    useUIStore.setState({ selectedSceneId: "scene-1" });
    const user = userEvent.setup();

    render(<SceneList project={makeProject()} />);
    await user.click(screen.getByText("シーン2"));

    expect(useUIStore.getState().selectedSceneId).toBe("scene-2");
  });

  it("カードのカウントの行を押しても、そのシーンに切り替わる", async () => {
    useProjectStore.setState({ scenes: SCENES });
    useUIStore.setState({ selectedSceneId: "scene-1" });
    const user = userEvent.setup();

    render(<SceneList project={makeProject()} />);
    // 2秒 = 4拍 = 1セット目の5カウント
    await user.click(screen.getByText(/1-5/));

    expect(useUIStore.getState().selectedSceneId).toBe("scene-2");
  });

  // 選択処理(selectSceneManually)は再生も止めるので、isPlaying が true の
  // ままかどうかで「カードのクリック処理が走ったか」を外から見分けられる
  it("操作ボタンを押したときは、カードの選択処理まで走らない", async () => {
    useProjectStore.setState({ scenes: SCENES });
    useUIStore.setState({ selectedSceneId: "scene-1", isPlaying: true });
    const user = userEvent.setup();

    render(<SceneList project={makeProject()} />);
    await user.click(screen.getAllByLabelText("シーン名を変更")[0]);

    expect(screen.getByLabelText("シーン名")).toBeInTheDocument();
    expect(useUIStore.getState().isPlaying).toBe(true);
  });

  it("鉛筆を押すとシーン名を変更できる", async () => {
    useProjectStore.setState({ scenes: SCENES });
    useUIStore.setState({ selectedSceneId: "scene-1" });
    vi.spyOn(scenesApi, "renameScene").mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<SceneList project={makeProject()} />);
    await user.click(screen.getAllByLabelText("シーン名を変更")[0]);
    const input = screen.getByLabelText("シーン名");
    await user.clear(input);
    await user.type(input, "オープニング{Enter}");

    await waitFor(() => {
      expect(useProjectStore.getState().scenes[0].name).toBe("オープニング");
    });
  });

  it("選択中シーンの位置をカウントで変更できる", async () => {
    useProjectStore.setState({ scenes: SCENES });
    useUIStore.setState({ selectedSceneId: "scene-2" });
    vi.spyOn(scenesApi, "updateSceneBeats").mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<SceneList project={makeProject()} />);
    const input = screen.getByLabelText("カウント");
    await user.clear(input);
    // 2-4 = 1セット(8拍) + 3 = 11拍目
    await user.type(input, "2-4");
    await user.tab();

    /* **打ったカウントが、そのまま拍として保存される**。
       ここが 11 でなければ、どこかで秒へ落としてから戻している */
    await waitFor(() => {
      expect(scenesApi.updateSceneBeats).toHaveBeenCalledWith(
        expect.anything(),
        [{ id: "scene-2", positionBeats: 11 }],
        expect.anything(),
      );
    });
    // BPM 120 なので 11拍 = 5.5秒。派生の秒も揃っている
    expect(useProjectStore.getState().scenes[1].timeSeconds).toBe(5.5);
  });

  /* **読めない値は丸めずに戻す。** 秒の形（1:20）で打っても、
     カウントとしては読めないので前の値のまま。半端な位置が黙って
     保存されると、打った数と画面の数が食い違う */
  it("秒の形(1:20)は読まず、前の値へ戻す", async () => {
    useProjectStore.setState({ scenes: SCENES });
    useUIStore.setState({ selectedSceneId: "scene-2" });
    vi.spyOn(scenesApi, "updateSceneBeats").mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<SceneList project={makeProject()} />);
    const input = screen.getByLabelText("カウント");
    await user.clear(input);
    await user.type(input, "1:20");
    await user.tab();

    expect(scenesApi.updateSceneBeats).not.toHaveBeenCalled();
    expect(useProjectStore.getState().scenes[1].timeSeconds).toBe(2);
  });

  // これが絶対位置にした理由そのもの。触っていないシーンは動かない
  it("既定では、変えたシーン以外の位置は動かない", async () => {
    const three = [
      makeScene({ timeSeconds: 0 }),
      makeScene({ id: "scene-2", orderIndex: 1, timeSeconds: 2 }),
      makeScene({ id: "scene-3", orderIndex: 2, timeSeconds: 5 }),
    ];
    useProjectStore.setState({ scenes: three });
    useUIStore.setState({ selectedSceneId: "scene-2" });
    vi.spyOn(scenesApi, "updateSceneBeats").mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<SceneList project={makeProject()} />);
    const input = screen.getByLabelText("カウント");
    await user.clear(input);
    // 1-7 = 6拍目 = 3秒
    await user.type(input, "1-7");
    await user.tab();

    await waitFor(() => {
      expect(useProjectStore.getState().scenes[1].timeSeconds).toBe(3);
    });
    expect(useProjectStore.getState().scenes[2].timeSeconds).toBe(5);
  });

  // 先頭にも位置はある(1-1 とは限らない)ので、入力欄は出す
  it("先頭シーンにもカウントの入力を出す", () => {
    useProjectStore.setState({ scenes: SCENES });
    useUIStore.setState({ selectedSceneId: "scene-1" });

    render(<SceneList project={makeProject()} />);

    expect(screen.getByLabelText("カウント")).toBeInTheDocument();
  });

  // ×は「小さいので誤タップしやすい」場所にある。押した瞬間に消えるのでは
  // なく、必ず確認をはさむ(シーン削除は元に戻せない)
  /* 選んでいる行は敷き色と番号の色で既に分かる。文字で言うと二重になる
     （実機の報告 17-4） */
  it("選んでいる行に「表示中」の札を出さない", () => {
    useProjectStore.setState({ scenes: SCENES });
    useUIStore.setState({ selectedSceneId: "scene-2" });
    render(<SceneList project={makeProject()} />);

    expect(screen.getByText("シーン2")).toBeInTheDocument();
    expect(screen.queryByText(/表示中/)).toBeNull();
  });

  it("サムネイルの×を押すと、即削除ではなく確認ダイアログを出す", async () => {
    useProjectStore.setState({ scenes: SCENES });
    useUIStore.setState({ selectedSceneId: "scene-1" });
    const user = userEvent.setup();

    render(<SceneList project={makeProject()} />);
    await user.click(screen.getByLabelText("「シーン2」を削除"));

    expect(useProjectStore.getState().scenes).toHaveLength(2);
    expect(useUIStore.getState().confirm?.title).toBe(
      "「シーン2」を削除しますか?",
    );
  });

  it("削除を確認するとSupabase削除後にローカルからも消え、別のシーンが選択される", async () => {
    useProjectStore.setState({ scenes: SCENES });
    useUIStore.setState({ selectedSceneId: "scene-1" });
    // 1件でも「まとめて消す」道を通る（規則を1つにするため）
    vi.spyOn(scenesApi, "deleteScenes").mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(
      <>
        <SceneList project={makeProject()} />
        <ConfirmDialog />
      </>,
    );
    await user.click(screen.getByRole("button", { name: "削除" }));
    expect(screen.getByText("「シーン1」を削除しますか?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "削除する" }));

    await waitFor(() => {
      expect(useProjectStore.getState().scenes).toHaveLength(1);
    });
    expect(useUIStore.getState().selectedSceneId).toBe("scene-2");
  });
});

/**
 * 曲が無いときは、カウントの副表示である秒を出さない
 * （実機の要望 2026-08-19。`showSeconds` は `hasMusic` で決まる）。
 */
describe("SceneList（曲もメトロノームも無いとき）", () => {
  beforeEach(() => {
    useProjectStore.setState({
      project: makeProject({ isMetronomeEnabled: false }),
      scenes: SCENES,
    });
    useUIStore.setState({ selectedSceneId: "scene-2" });
  });

  it("時刻の欄を出さない", () => {
    render(<SceneList project={makeProject()} />);
    expect(screen.queryByLabelText(/曲の中の位置|時刻/)).toBeNull();
    expect(screen.queryByText(/0:02\.0/)).toBeNull();
  });

  it("移動時間の欄も出さない（どの移動も同じ秒数なので、言うことが無い）", () => {
    render(<SceneList project={makeProject()} />);
    expect(screen.queryByLabelText(/何秒で動くか/)).toBeNull();
  });

  /* カードから数字がまるごと落ちる。これが「一覧を簡略にしたい」への答え */
  it("カードに秒数の行を出さない", () => {
    render(<SceneList project={makeProject()} />);
    expect(screen.queryByText(/s で移動/)).toBeNull();
  });
});

/**
 * まとめて消すための「選ぶ」モード。
 *
 * ■ 「見ている」と「印が付いている」は別のこと
 * `selectedSceneId` はステージが描いている相手で、消す相手ではない。
 * モードの間に行を押しても、見ている場所は動かない。
 */
describe("シーンをまとめて選んで消す", () => {
  const THREE = [
    makeScene({ timeSeconds: 0 }),
    makeScene({ id: "scene-2", name: "シーン2", orderIndex: 1, timeSeconds: 2 }),
    makeScene({ id: "scene-3", name: "シーン3", orderIndex: 2, timeSeconds: 4 }),
  ];

  beforeEach(() => {
    useProjectStore.setState({
      project: makeProject({ isMetronomeEnabled: true }),
      scenes: THREE,
    });
    useUIStore.setState({ selectedSceneId: "scene-1", sceneSelection: null });
  });

  function renderList() {
    return render(
      <>
        <SceneList project={makeProject({ isMetronomeEnabled: true })} />
        <ConfirmDialog />
      </>,
    );
  }

  it("「選ぶ」を押すまでは、印の升は出ない", async () => {
    renderList();
    expect(screen.queryAllByTestId("scene-check")).toHaveLength(0);

    await userEvent.setup().click(screen.getByRole("button", { name: /選ぶ/ }));
    expect(screen.getAllByTestId("scene-check")).toHaveLength(3);
  });

  it("モードの間に行を押しても、見ているシーンは動かない", async () => {
    const user = userEvent.setup();
    renderList();
    await user.click(screen.getByRole("button", { name: /選ぶ/ }));
    await user.click(screen.getByText("シーン3"));

    // 印が付くだけ。ステージが別のシーンへ飛ばない
    expect(useUIStore.getState().selectedSceneId).toBe("scene-1");
    expect(useUIStore.getState().sceneSelection).toEqual(["scene-3"]);
  });

  it("もう一度押すと印が外れる", async () => {
    const user = userEvent.setup();
    renderList();
    await user.click(screen.getByRole("button", { name: /選ぶ/ }));
    await user.click(screen.getByText("シーン3"));
    await user.click(screen.getByText("シーン3"));

    expect(useUIStore.getState().sceneSelection).toEqual([]);
  });

  it("「全部を選ぶ」で全件に印が付き、もう一度押すと全部外れる", async () => {
    const user = userEvent.setup();
    renderList();
    await user.click(screen.getByRole("button", { name: /選ぶ/ }));
    await user.click(screen.getByRole("button", { name: "全部を選ぶ" }));
    expect(useUIStore.getState().sceneSelection).toHaveLength(3);

    await user.click(screen.getByRole("button", { name: "全部を外す" }));
    expect(useUIStore.getState().sceneSelection).toEqual([]);
  });

  it("何も選んでいない間は、消すボタンを押せない", async () => {
    const user = userEvent.setup();
    renderList();
    await user.click(screen.getByRole("button", { name: /選ぶ/ }));

    expect(
      screen.getByRole("button", { name: "消したいシーンを押してください" }),
    ).toBeDisabled();
  });

  it("「やめる」でモードを出ると、印もまとめて落ちる", async () => {
    const user = userEvent.setup();
    renderList();
    await user.click(screen.getByRole("button", { name: /選ぶ/ }));
    await user.click(screen.getByText("シーン2"));
    await user.click(screen.getByRole("button", { name: /やめる/ }));

    // モードと印をひとつの値で持っているので、取り残しが起きない
    expect(useUIStore.getState().sceneSelection).toBeNull();
    expect(screen.queryAllByTestId("scene-check")).toHaveLength(0);
  });

  it("2件選んで消すと、確認を挟んでから両方消える", async () => {
    vi.spyOn(scenesApi, "deleteScenes").mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderList();
    await user.click(screen.getByRole("button", { name: /選ぶ/ }));
    await user.click(screen.getByText("シーン1"));
    await user.click(screen.getByText("シーン2"));
    await user.click(screen.getByRole("button", { name: "2件を削除" }));

    // 押しただけでは消えない
    expect(screen.getByText("2 件のシーンを削除しますか?")).toBeInTheDocument();
    expect(useProjectStore.getState().scenes).toHaveLength(3);

    await user.click(screen.getByRole("button", { name: "削除する" }));
    await waitFor(() => {
      expect(useProjectStore.getState().scenes).toHaveLength(1);
    });
    // 見ていたシーン1が消えたので、生き残っている次の相手へ送られる
    expect(useUIStore.getState().selectedSceneId).toBe("scene-3");
    // 消し終わったらモードから出る
    expect(useUIStore.getState().sceneSelection).toBeNull();
  });

  it("全部消すと、シーンが1つも無い状態になる", async () => {
    vi.spyOn(scenesApi, "deleteScenes").mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderList();
    await user.click(screen.getByRole("button", { name: /選ぶ/ }));
    await user.click(screen.getByRole("button", { name: "全部を選ぶ" }));
    await user.click(screen.getByRole("button", { name: "3件を削除" }));
    await user.click(screen.getByRole("button", { name: "削除する" }));

    await waitFor(() => {
      expect(useProjectStore.getState().scenes).toHaveLength(0);
    });
    // 0件は正しい状態。空のステージが自分の言葉で知らせる
    expect(useUIStore.getState().selectedSceneId).toBeNull();
  });
});

/**
 * 消したあと、**どのシーンを見せるか**。
 *
 * 判断そのものは純粋関数（`lib/sceneAfterDelete`）にあるが、
 * **そこへ何を渡すか**は誰も見ていなかった。真ん中を消したときだけ
 * 「先頭へ飛ぶ」と答えが分かれるので、そこで縛る。
 */
describe("消したあとに見せるシーン", () => {
  beforeEach(() => {
    useProjectStore.setState({
      project: makeProject({ isMetronomeEnabled: true }),
      scenes: [
        makeScene({ timeSeconds: 0 }),
        makeScene({
          id: "scene-2",
          name: "シーン2",
          orderIndex: 1,
          timeSeconds: 2,
        }),
        makeScene({
          id: "scene-3",
          name: "シーン3",
          orderIndex: 2,
          timeSeconds: 4,
        }),
      ],
    });
    useUIStore.setState({ selectedSceneId: "scene-2", sceneSelection: null });
  });

  it("真ん中を消したら、先頭へ戻さずに次のシーンへ送る", async () => {
    vi.spyOn(scenesApi, "deleteScenes").mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <>
        <SceneList project={makeProject({ isMetronomeEnabled: true })} />
        <ConfirmDialog />
      </>,
    );
    await user.click(screen.getByRole("button", { name: /選ぶ/ }));
    await user.click(screen.getByText("シーン2"));
    await user.click(screen.getByRole("button", { name: "1件を削除" }));
    await user.click(screen.getByRole("button", { name: "削除する" }));

    await waitFor(() => {
      expect(useProjectStore.getState().scenes).toHaveLength(2);
    });
    // 先頭へ戻すと、消した所より前をもう一度見ることになる
    expect(useUIStore.getState().selectedSceneId).toBe("scene-3");
  });

  it("見ていないシーンを消したら、見ている場所は動かない", async () => {
    vi.spyOn(scenesApi, "deleteScenes").mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <>
        <SceneList project={makeProject({ isMetronomeEnabled: true })} />
        <ConfirmDialog />
      </>,
    );
    await user.click(screen.getByRole("button", { name: /選ぶ/ }));
    await user.click(screen.getByText("シーン3"));
    await user.click(screen.getByRole("button", { name: "1件を削除" }));
    await user.click(screen.getByRole("button", { name: "削除する" }));

    await waitFor(() => {
      expect(useProjectStore.getState().scenes).toHaveLength(2);
    });
    expect(useUIStore.getState().selectedSceneId).toBe("scene-2");
  });
});

/**
 * 区間を【キープ】と【移動】に割る欄。
 *
 * user の指摘（2026-08-24）:「ある程度そのフォーメーションに滞在して、
 * 一瞬で移動する場合もあると思います」。
 *
 * 割り方そのものは純粋関数（`lib/segmentSplit`）が持つ。ここで縛るのは
 * **そこへ何を渡し、返ってきた値をどこへ出すか** — 今日2回、そこに穴が
 * あった（`useDancerGrab` と `sceneAfterDelete`）。
 */
describe("区間の割り方（カウント）", () => {
  beforeEach(() => {
    useProjectStore.setState({
      project: makeProject({ isMetronomeEnabled: true }),
      scenes: [
        makeScene({ timeSeconds: 0 }),
        makeScene({
          id: "scene-2",
          name: "シーン2",
          orderIndex: 1,
          timeSeconds: 4,
        }),
      ],
    });
    /* 欄が出るのは**出ていく側**なので、開くのは先頭。
       書き換わるのは scene-2 の列（区間は行き先が持っている） */
    useUIStore.setState({ selectedSceneId: "scene-1", sceneSelection: null });
  });

  /* 欄は2つ出るが、**保存しているのは移動の側だけ**。滞在は
     区間から引いて出している（lib/segmentSplit） */
  const holdInput = () =>
    screen.getByLabelText(/このフォーメーションのまま止まっているカウント数/);
  const moveInput = () =>
    screen.getByLabelText(/次のシーンへ動くのに使うカウント数/);

  /* 4秒の区間・BPM 120 → **8カウント**。以降この数で読む */
  it("決めていなければ、区間まるごとを使う（滞在は0）", () => {
    render(<SceneList project={makeProject({ isMetronomeEnabled: true })} />);
    expect(holdInput()).toHaveValue(0);
    expect(moveInput()).toHaveValue(8);
  });

  it("移動を短くすると、余りが滞在として出る", () => {
    useProjectStore.setState((state) => ({
      scenes: state.scenes.map((scene) =>
        scene.id === "scene-2" ? { ...scene, moveBeats: 2 } : scene,
      ),
    }));
    render(<SceneList project={makeProject({ isMetronomeEnabled: true })} />);

    // 8カウントの区間で2カウントだけ動く → 6カウントは止まっている
    expect(holdInput()).toHaveValue(6);
    expect(moveInput()).toHaveValue(2);
  });

  /* ここが 2026-08-24 に入れ替えた向き。**先頭に出て、最後に出ない**。
     逆を書くと、滞在の秒数と画面に見えている隊形が食い違う */
  it("先頭のシーンにも出す（次のシーンへ出ていく区間があるため）", () => {
    render(<SceneList project={makeProject({ isMetronomeEnabled: true })} />);
    expect(holdInput()).toBeInTheDocument();
  });

  it("最後のシーンには出さない（出ていく先が無い）", () => {
    useUIStore.setState({ selectedSceneId: "scene-2" });
    render(<SceneList project={makeProject({ isMetronomeEnabled: true })} />);
    expect(
      screen.queryByLabelText(/このフォーメーションのまま止まっているカウント数/),
    ).not.toBeInTheDocument();
  });

  /* **書き込む先は次のシーン**。開いているシーンの列を書き換えると、
     1つ手前の区間が動いてしまう（純粋関数のテストからは見えない） */
  it("欄に打つと、そのカウント数が【次のシーン】へ保存される", async () => {
    const spy = vi
      .spyOn(scenesApi, "updateSceneMoveBeats")
      .mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<SceneList project={makeProject({ isMetronomeEnabled: true })} />);

    const input = moveInput();
    await user.clear(input);
    await user.type(input, "3");
    await user.tab();

    // 開いているのは scene-1 だが、書き換わるのは scene-2
    await waitFor(() => {
      /* **打ったカウントがそのまま拍として保存される**。
         ここが 1.5 なら、どこかで秒として扱っている */
      expect(spy).toHaveBeenCalledWith(
        expect.anything(),
        "scene-2",
        3,
        expect.anything(),
        expect.anything(),
      );
    });
    // 隣の欄にも、引き算した残りがその場で出る
    expect(holdInput()).toHaveValue(5);
  });

  /* ここが**キープの欄から打つ側**。打った数がそのまま保存される移動の
     欄とは【答えが分かれる】ので、同じ値で書くと潰しても緑のままになる
     （.claude/rules/testing.md 4節） */
  it("滞在の欄に打つと、区間から引いた分が【移動】として保存される", async () => {
    const spy = vi
      .spyOn(scenesApi, "updateSceneMoveBeats")
      .mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<SceneList project={makeProject({ isMetronomeEnabled: true })} />);

    await user.clear(holdInput());
    await user.type(holdInput(), "3");
    await user.tab();

    // 打ったのは 3（滞在）だが、保存されるのは 8 − 3 = 5 の方
    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith(
        expect.anything(),
        "scene-2",
        5,
        expect.anything(),
        expect.anything(),
      );
    });
    expect(moveInput()).toHaveValue(5);
  });

  /* 刻みは【1カウント】で、**BPM に関わらず 1**（2026-08-26）。
     以前は秒で打っていたので `secondsPerBeat(bpm)` を渡していた。
     BPM を既定（120）から外した値で見る — 刻みが速さに引きずられて
     いたら、ここで 0.4 になって落ちる */
  it("上下キーの刻みは、速さに関わらず1カウント", () => {
    const project = makeProject({ isMetronomeEnabled: true, bpm: 150 });
    useProjectStore.setState({ project });
    render(<SceneList project={project} />);

    expect(holdInput()).toHaveAttribute("step", "1");
    expect(moveInput()).toHaveAttribute("step", "1");
  });

  /* ここからバー（2026-08-25）。純粋関数（lib/segmentBar）は境目の計算しか
     守っていない。**バーが正しい区間の長さを渡しているか**と
     **書き込む先が次のシーンか**は、こちら側でしか見えない */
  describe("区間バー", () => {
    /** jsdom は幅を持たないので、200px の帯として答えさせる */
    function widenBar(): HTMLElement {
      const bar = screen.getByTestId("segment-split-bar");
      bar.getBoundingClientRect = () =>
        ({
          left: 0,
          top: 0,
          right: 200,
          bottom: 10,
          width: 200,
          height: 10,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }) as DOMRect;
      bar.setPointerCapture = vi.fn();
      return bar;
    }

    it("割っている区間の長さを出す", () => {
      render(<SceneList project={makeProject({ isMetronomeEnabled: true })} />);
      expect(screen.getByText("区間 8カウント")).toBeInTheDocument();
    });

    /* **区間の長さを渡し違えていないか。** 4秒の区間の 3/4 の所を
       押したとき、答えが 1 になるのは区間が 4 のときだけ */
    it("引いて離すと、その割り方が【次のシーン】へ保存される", () => {
      const spy = vi
        .spyOn(scenesApi, "updateSceneMoveBeats")
        .mockResolvedValue(undefined);
      render(<SceneList project={makeProject({ isMetronomeEnabled: true })} />);

      const bar = widenBar();
      fireEvent.pointerDown(bar, { pointerId: 1, clientX: 150 });
      fireEvent.pointerUp(bar, { pointerId: 1, clientX: 150 });

      // 開いているのは scene-1 だが、書き換わるのは scene-2。
      // 200px のうち 150px まで待つ → 滞在6・移動2カウント
      expect(spy).toHaveBeenCalledWith(
        expect.anything(),
        "scene-2",
        2,
        expect.anything(),
        expect.anything(),
      );
    });

    /* **刻みは速さに引きずられない。** カウントは数えるものなので、
       BPM が何であっても右キー1回は1カウント。以前は
       `secondsPerBeat(bpm)` を渡していたので、ここを速さに戻すと落ちる */
    it("矢印キーの刻みは、速さに関わらず1カウント", () => {
      const spy = vi
        .spyOn(scenesApi, "updateSceneMoveBeats")
        .mockResolvedValue(undefined);
      const project = makeProject({ isMetronomeEnabled: true, bpm: 150 });
      useProjectStore.setState({ project });
      render(<SceneList project={project} />);

      fireEvent.keyDown(screen.getByTestId("segment-split-bar"), {
        key: "ArrowRight",
      });

      /* 区間は8カウント。右キー1回で滞在が1カウント増えるので、
         移動は 8 − 1 = 7。**速さを刻みに混ぜたらここが落ちる** */
      expect(spy).toHaveBeenCalledWith(
        expect.anything(),
        "scene-2",
        7,
        expect.anything(),
        expect.anything(),
      );
    });

    it("最後のシーンには出さない（出ていく先が無い）", () => {
      useUIStore.setState({ selectedSceneId: "scene-2" });
      render(<SceneList project={makeProject({ isMetronomeEnabled: true })} />);
      expect(screen.queryByTestId("segment-split-bar")).toBeNull();
    });
  });

  it("キープの欄を空にすると、区間まるごとへ戻す（null を保存する）", async () => {
    useProjectStore.setState((state) => ({
      scenes: state.scenes.map((scene) =>
        scene.id === "scene-2" ? { ...scene, moveSeconds: 1 } : scene,
      ),
    }));
    const spy = vi
      .spyOn(scenesApi, "updateSceneMoveBeats")
      .mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<SceneList project={makeProject({ isMetronomeEnabled: true })} />);

    await user.clear(holdInput());
    await user.tab();

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith(
        expect.anything(),
        "scene-2",
        null,
        expect.anything(),
        expect.anything(),
      );
    });
  });
});
