import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SceneDock } from "./SceneDock";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useMusicStore } from "@/features/music/store/useMusicStore";
import { useSettingsStore } from "@/features/settings/store/useSettingsStore";
import * as scenesApi from "@/features/scene/api/scenes";
import * as positionsApi from "@/features/scene/api/positions";
import type { Project } from "@/features/project/types";

import { makeProject as makeBaseProject, makeScene } from "@/test/factories";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({}),
}));

// このファイルは8×8のステージ前提
function makeProject(overrides: Partial<Project> = {}): Project {
  return makeBaseProject({
    title: "サンプル",
    stageWidth: 8,
    stageHeight: 8,
    ...overrides,
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  // 音楽ストアはvitest.setupの初期化対象に入っていないので自分で戻す
  useMusicStore.setState({
    objectUrl: null,
    fileName: null,
    durationSeconds: null,
    // 再生位置も戻す。残したままだと、前のテストで進んだ秒数から
    // 時計が動き出して、次のテストが選ぶシーンを変えてしまう
    currentTime: 0,
  });
});

/**
 * ドックは「今どこにいるか」を見せる場所で、シーンをいじる操作は持たない。
 * 改名・遷移時間・複製・削除はシーン一覧のカード側にあるので、
 * それらのテストは SceneList.test.tsx にある。
 */
describe("SceneDock", () => {
  it("選択中のシーンの番号と名前を出す", () => {
    useProjectStore.setState({
      // 秒数の行が出るのは【合わせる相手があるとき】。曲も拍も無いと
      // 「シーン 2 / 2」に変わる（features/scene/lib/timelineMode）
      project: makeProject({ isMetronomeEnabled: true }),
      scenes: [
        makeScene({ timeSeconds: 0 }),
        makeScene({
          id: "scene-2",
          name: "サビ",
          orderIndex: 1,
          timeSeconds: 1,
        }),
      ],
    });
    useUIStore.setState({ selectedSceneId: "scene-2" });

    render(<SceneDock project={makeProject()} />);

    // 時刻は【いま再生している位置】(先頭なら0:00.0)。その隣に、
    // 選択中のシーンへ入ってくるのにかかる秒数が出る
    expect(screen.getByText(/· 1秒で移動/)).toBeInTheDocument();
    // 曲が入っていないので、時刻ではなくカウントで読む
    expect(screen.getByText("1セット 1カウント")).toBeInTheDocument();
    expect(screen.getAllByText("サビ").length).toBeGreaterThan(0);
  });

  it("シーンが1つも無くても追加ボタンは出す", () => {
    render(<SceneDock project={makeProject()} />);

    expect(screen.getByLabelText("シーンを追加")).toBeInTheDocument();
  });

  it("追加ボタンでシーンを作成し、選択状態にする", async () => {
    vi.spyOn(scenesApi, "createScene").mockResolvedValue(
      makeScene({ id: "irrelevant" }),
    );
    const user = userEvent.setup();

    render(<SceneDock project={makeProject()} />);
    await user.click(screen.getByLabelText("シーンを追加"));

    await waitFor(() => {
      expect(useProjectStore.getState().scenes).toHaveLength(1);
    });
    expect(useUIStore.getState().selectedSceneId).toBe(
      useProjectStore.getState().scenes[0].id,
    );
  });

  it("シーン追加時、選択中シーンの配置をコピーする", async () => {
    useProjectStore.setState({
      scenes: [makeScene()],
      dancers: {
        "dancer-1": {
          id: "dancer-1",
          projectId: "project-1",
          name: "あいり",
          color: "#3b82f6",
          initialDirection: 0,
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      },
      positionsBySceneId: {
        "scene-1": {
          "dancer-1": {
            sceneId: "scene-1",
            dancerId: "dancer-1",
            xCoordinate: 3,
            yCoordinate: 5,
            rotationAngle: 90,
          },
        },
      },
    });
    useUIStore.setState({ selectedSceneId: "scene-1" });
    vi.spyOn(scenesApi, "createScene").mockResolvedValue(
      makeScene({ id: "irrelevant" }),
    );
    const upsertSpy = vi
      .spyOn(positionsApi, "upsertPositions")
      .mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<SceneDock project={makeProject()} />);
    await user.click(screen.getByLabelText("シーンを追加"));

    await waitFor(() => {
      expect(useProjectStore.getState().scenes).toHaveLength(2);
    });
    const newSceneId = useUIStore.getState().selectedSceneId!;
    const copied =
      useProjectStore.getState().positionsBySceneId[newSceneId]["dancer-1"];
    expect(copied).toMatchObject({
      xCoordinate: 3,
      yCoordinate: 5,
      rotationAngle: 90,
    });
    // 何人いても1回の呼び出しにまとめる(1人ずつだと人数ぶん往復する)
    expect(upsertSpy).toHaveBeenCalledTimes(1);
    expect(upsertSpy).toHaveBeenCalledWith(expect.anything(), [
      expect.objectContaining({ sceneId: newSceneId, dancerId: "dancer-1" }),
    ]);
  });

  it("作成に失敗したらロールバックしてトースト表示する", async () => {
    vi.spyOn(scenesApi, "createScene").mockRejectedValue(new Error("network"));
    const user = userEvent.setup();

    render(<SceneDock project={makeProject()} />);
    await user.click(screen.getByLabelText("シーンを追加"));

    await waitFor(() => {
      expect(useProjectStore.getState().scenes).toHaveLength(0);
    });
    expect(useUIStore.getState().selectedSceneId).toBeNull();
    expect(useUIStore.getState().toast?.type).toBe("error");
  });

  // 曲が入っている間は、曲の再生位置がシーンを決める(useMusicPlayback)。
  // 曲なしの時計(useSilentClock)も一緒に動くと、2つの時計が同じ選択を
  // 奪い合い、曲より先にシーンだけが進んでしまう
  it("曲が入っている間は、曲なしの時計でシーンを進めない", () => {
    vi.useFakeTimers();
    useProjectStore.setState({
      scenes: [
        makeScene({ timeSeconds: 0 }),
        makeScene({
          id: "scene-2",
          orderIndex: 1,
          timeSeconds: 1,
        }),
      ],
    });
    useUIStore.setState({ selectedSceneId: "scene-1", isPlaying: true });
    useMusicStore.setState({ objectUrl: "blob:song", fileName: "song.mp3" });

    render(<SceneDock project={makeProject()} />);
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(useUIStore.getState().selectedSceneId).toBe("scene-1");
    vi.useRealTimers();
  });

  it("曲が無ければ、今までどおりタイマーで次のシーンへ進む", () => {
    vi.useFakeTimers();
    useProjectStore.setState({
      scenes: [
        makeScene({ timeSeconds: 1 }),
        makeScene({
          id: "scene-2",
          orderIndex: 1,
          timeSeconds: 1,
        }),
      ],
    });
    useUIStore.setState({ selectedSceneId: "scene-1", isPlaying: true });

    render(<SceneDock project={makeProject()} />);
    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(useUIStore.getState().selectedSceneId).toBe("scene-2");
    vi.useRealTimers();
  });

  it("シーン名はここでは変更できない(一覧のカードへ移した)", () => {
    useProjectStore.setState({ scenes: [makeScene()] });
    useUIStore.setState({ selectedSceneId: "scene-1" });

    render(<SceneDock project={makeProject()} />);

    expect(screen.queryByLabelText("シーン名を変更")).not.toBeInTheDocument();
  });

  /**
   * ここは押した瞬間の判断だけを見たいので、クリックは fireEvent で送る。
   * userEvent は待ちが入るぶん、その間に時計(useSilentClock)が数フレーム
   * 進んでシーンを動かしてしまい、何を確かめているのか分からなくなる。
   */
  describe("最後まで流し終えたあとの再生", () => {
    const threeScenes = () => [
      makeScene({ timeSeconds: 0 }),
      makeScene({ id: "scene-2", orderIndex: 1, timeSeconds: 2 }),
      makeScene({ id: "scene-3", orderIndex: 2, timeSeconds: 4 }),
    ];

    const pressPlay = () => {
      fireEvent.click(screen.getByLabelText("最後のシーンまで再生"));
    };

    /** 最後まで流れて止まった状態。時計が作るのと同じ形にする */
    const finishedAtLastScene = () => {
      act(() => {
        useUIStore.setState({ isPlaying: false, selectedSceneId: "scene-3" });
      });
    };

    it("前回始めたシーンへ戻ってから、もう一度流す", () => {
      useProjectStore.setState({ scenes: threeScenes() });
      useUIStore.setState({ selectedSceneId: "scene-2" });
      render(<SceneDock project={makeProject()} />);

      pressPlay();
      expect(useUIStore.getState().playbackStartSceneId).toBe("scene-2");

      finishedAtLastScene();
      pressPlay();

      expect(useUIStore.getState().selectedSceneId).toBe("scene-2");
      expect(useUIStore.getState().isPlaying).toBe(true);
      // 曲が無いときは時刻もそのシーンへ戻す
      expect(useMusicStore.getState().currentTime).toBe(2);
    });

    // 押したのに何も起きない状態を残さない。開き直した直後がこれにあたる
    it("どこから始めたか覚えていなければ、先頭から流す", () => {
      useProjectStore.setState({ scenes: threeScenes() });
      useUIStore.setState({ selectedSceneId: "scene-3" });
      render(<SceneDock project={makeProject()} />);

      pressPlay();

      expect(useUIStore.getState().selectedSceneId).toBe("scene-1");
      expect(useMusicStore.getState().currentTime).toBe(0);
    });

    // 止まったあとに手で選び直した場合。そこから見たいのであって、
    // 前回の場所へ引き戻されては困る
    it("まだ先があるシーンを選んでいれば、そこから流す", () => {
      useProjectStore.setState({ scenes: threeScenes() });
      useUIStore.setState({
        selectedSceneId: "scene-2",
        playbackStartSceneId: "scene-1",
      });
      render(<SceneDock project={makeProject()} />);

      pressPlay();

      expect(useUIStore.getState().selectedSceneId).toBe("scene-2");
      // 次に終端で押されたときは、ここへ戻ってくる
      expect(useUIStore.getState().playbackStartSceneId).toBe("scene-2");
    });
  });

  // リグレッションテスト: スペースキーは isPlaying を直に立てていたので、
  // 予備拍を設定している人でもキーボードからだけは数えずに始まっていた。
  // 「押された」合図をドックが受けて、ボタンと同じ道を通す
  describe("スペースキーからの再生", () => {
    afterEach(() => {
      useSettingsStore.setState({ countIn: 0 });
    });

    it("予備拍を設定していれば、キーボードからでも数えてから始まる", () => {
      useSettingsStore.setState({ countIn: 4 });
      useProjectStore.setState({ scenes: [makeScene({ timeSeconds: 0 })] });
      useUIStore.setState({ selectedSceneId: "scene-1" });

      render(<SceneDock project={makeProject()} />);
      act(() => {
        useUIStore.getState().requestTogglePlay();
      });

      // 数えている間はまだ動き出していない。ボタンには残りの拍が出る
      expect(useUIStore.getState().isPlaying).toBe(false);
      expect(screen.getByTestId("count-in-beat")).toHaveTextContent("4");
    });

    it("予備拍が無ければ、その場で始まる", () => {
      useProjectStore.setState({ scenes: [makeScene({ timeSeconds: 0 })] });
      useUIStore.setState({ selectedSceneId: "scene-1" });

      render(<SceneDock project={makeProject()} />);
      act(() => {
        useUIStore.getState().requestTogglePlay();
      });

      expect(useUIStore.getState().isPlaying).toBe(true);
    });
  });
});

/**
 * 順番だけで作っているときは、ドックの行から秒が消える。
 * 空にすると再生中にどこに居るのか読む先が無くなるので、
 * 代わりに「何番目か」を置いている（実機の報告 17-3）。
 */
describe("SceneDock（曲もメトロノームも無いとき）", () => {
  beforeEach(() => {
    useProjectStore.setState({
      project: makeProject({ isMetronomeEnabled: false }),
      scenes: [
        makeScene({ timeSeconds: 0 }),
        makeScene({
          id: "scene-2",
          name: "サビ",
          orderIndex: 1,
          timeSeconds: 4,
        }),
      ],
    });
    useUIStore.setState({ selectedSceneId: "scene-2" });
  });

  it("秒を出さず、何番目かを出す", () => {
    render(<SceneDock project={makeProject()} />);

    expect(screen.getByText("シーン 2 / 2")).toBeInTheDocument();
    expect(screen.queryByText(/秒で移動/)).toBeNull();
    expect(screen.queryByText(/0:0/)).toBeNull();
  });
});

/**
 * シーンがまだ1つも無いとき。
 *
 * **曲があるなら流せる**（実機の報告 2026-08-22:「曲を導入した際、
 * シーンがないと再生できない」）。曲に合わせて作る人は、まず聞いて
 * 置き所を決めるので、進む先が無いことと鳴らせないことは別。
 *
 * なお**最初のシーンは必ず0秒**に置かれる（`useAddScene`。最初の隊形は
 * 「曲のこの秒から」ではなく「はじまり」）。ここは変えていない。
 */
describe("SceneDock（シーンがまだ無いとき）", () => {
  beforeEach(() => {
    useProjectStore.setState({ project: makeProject(), scenes: [] });
    useUIStore.setState({ selectedSceneId: null, isPlaying: false });
  });

  it("曲があれば、再生のボタンが出る", () => {
    useMusicStore.setState({ objectUrl: "blob:song", fileName: "song.mp3" });
    render(<SceneDock project={makeProject()} />);

    expect(screen.getByRole("button", { name: "曲を流す" })).toBeInTheDocument();
  });

  it("曲が無ければ、再生のボタンは出ない", () => {
    render(<SceneDock project={makeProject()} />);

    expect(screen.queryByRole("button", { name: "曲を流す" })).toBeNull();
    expect(screen.getByText("シーンがありません")).toBeInTheDocument();
  });

  it("押すと、曲だけが流れ始める", async () => {
    useMusicStore.setState({ objectUrl: "blob:song", fileName: "song.mp3" });
    const user = userEvent.setup();
    render(<SceneDock project={makeProject()} />);

    await user.click(screen.getByRole("button", { name: "曲を流す" }));

    await waitFor(() => expect(useUIStore.getState().isPlaying).toBe(true));
    expect(screen.getByText("曲だけ流しています")).toBeInTheDocument();
  });

  it("流している間に押すと止まる", async () => {
    useMusicStore.setState({ objectUrl: "blob:song", fileName: "song.mp3" });
    useUIStore.setState({ isPlaying: true });
    const user = userEvent.setup();
    render(<SceneDock project={makeProject()} />);

    await user.click(screen.getByRole("button", { name: "再生を停止" }));

    expect(useUIStore.getState().isPlaying).toBe(false);
  });

  /* 曲があるときは**鳴らしている最中だけ**増やせる（canAddScene）。
     止めたまま増やすと「なんとなくの秒数」に置かれ、あとから音へ
     合わせ直す作業が生まれる（2026-08-22 に user が決めた仕様） */
  it("止まっている間、＋ は押せない", () => {
    useMusicStore.setState({ objectUrl: "blob:song", fileName: "song.mp3" });
    render(<SceneDock project={makeProject()} />);

    expect(screen.getByRole("button", { name: "シーンを追加" })).toBeDisabled();
  });

  it("鳴らしている間は ＋ を押せる", () => {
    useMusicStore.setState({ objectUrl: "blob:song", fileName: "song.mp3" });
    useUIStore.setState({ isPlaying: true });
    render(<SceneDock project={makeProject()} />);

    expect(screen.getByRole("button", { name: "シーンを追加" })).toBeEnabled();
  });

  /* 曲が無ければ、合わせる相手が居ないので今までどおり */
  it("曲が無ければ、止まっていても ＋ を押せる", () => {
    render(<SceneDock project={makeProject()} />);

    expect(screen.getByRole("button", { name: "シーンを追加" })).toBeEnabled();
  });
});

/**
 * 曲があるときの、止まり方。
 *
 * **曲が鳴り終わるまで流す**（2026-08-22 に user が決めた）。以前は
 * 最後のシーンへ着いた時点で止めていたが、作っている途中は「最後の
 * シーンより後ろにも曲がある」のが普通で、そこを聞けないと残りに
 * 何秒あるのかが分からなかった。
 */
describe("SceneDock（曲があるときは、曲の終わりまで流す）", () => {
  beforeEach(() => {
    useProjectStore.setState({
      project: makeProject(),
      scenes: [
        makeScene({ timeSeconds: 0 }),
        makeScene({ id: "scene-2", orderIndex: 1, timeSeconds: 2 }),
      ],
    });
    useUIStore.setState({ selectedSceneId: "scene-1", isPlaying: true });
    useMusicStore.setState({ objectUrl: "blob:song", fileName: "song.mp3" });
  });

  it("最後のシーンを過ぎても、曲が鳴っている間は止まらない", async () => {
    render(<SceneDock project={makeProject()} />);
    const audio = document.querySelector("audio");
    if (!audio) throw new Error("audio が無い");
    // 最後のシーン(2秒)より後ろ。曲はまだ鳴っている
    Object.defineProperty(audio, "currentTime", { value: 30, writable: true });
    Object.defineProperty(audio, "ended", { value: false, writable: true });

    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(useUIStore.getState().isPlaying).toBe(true);
  });

  it("曲が鳴り終わったら止まる", async () => {
    render(<SceneDock project={makeProject()} />);
    const audio = document.querySelector("audio");
    if (!audio) throw new Error("audio が無い");
    Object.defineProperty(audio, "currentTime", { value: 200, writable: true });
    Object.defineProperty(audio, "ended", { value: true, writable: true });

    await waitFor(() => expect(useUIStore.getState().isPlaying).toBe(false));
  });

  /* 曲は最後まで流せるので、止めた所から何十秒も戻されると困る */
  it("最後のシーンより後ろで止めても、曲は巻き戻らない", async () => {
    const user = userEvent.setup();
    render(<SceneDock project={makeProject()} />);
    const audio = document.querySelector("audio");
    if (!audio) throw new Error("audio が無い");
    Object.defineProperty(audio, "currentTime", { value: 30, writable: true });
    Object.defineProperty(audio, "ended", { value: false, writable: true });

    await user.click(screen.getByRole("button", { name: "再生を停止" }));

    expect(useUIStore.getState().isPlaying).toBe(false);
    expect(audio.currentTime).toBe(30);
  });
});

/**
 * 時間軸の縦線を置いた所から鳴らす。
 *
 * 実機の報告（2026-08-22）:「曲の始めたい位置に縦線を置いて再生しても、
 * 最初のシーンの場所から再生される」。押した瞬間に【選んでいるシーンの
 * 位置】へ飛ばしていたのが原因。
 */
describe("SceneDock（曲があるとき、どこから鳴るか）", () => {
  beforeEach(() => {
    useProjectStore.setState({
      project: makeProject(),
      scenes: [
        makeScene({ timeSeconds: 0 }),
        makeScene({ id: "scene-2", orderIndex: 1, timeSeconds: 4 }),
      ],
    });
    useUIStore.setState({ selectedSceneId: "scene-1", isPlaying: false });
    useMusicStore.setState({ objectUrl: "blob:song", fileName: "song.mp3" });
  });

  it("縦線を置いた所から鳴る（先頭のシーンへ戻さない）", async () => {
    const user = userEvent.setup();
    render(<SceneDock project={makeProject()} />);
    const audio = document.querySelector("audio");
    if (!audio) throw new Error("audio が無い");
    // 時間軸を触って、12秒の所へ縦線を置いた状態
    Object.defineProperty(audio, "currentTime", { value: 12, writable: true });
    Object.defineProperty(audio, "ended", { value: false, writable: true });

    await user.click(
      screen.getByRole("button", { name: "最後のシーンまで再生" }),
    );

    await waitFor(() => expect(useUIStore.getState().isPlaying).toBe(true));
    // 先頭のシーン(0秒)へ戻されていない
    expect(audio.currentTime).toBe(12);
  });
});
