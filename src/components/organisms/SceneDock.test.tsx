import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
      expect(screen.getByRole("status")).toHaveTextContent("4");
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
