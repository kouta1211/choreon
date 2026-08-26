import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { useAddScene } from "./useAddScene";
import { LocaleProvider } from "@/features/i18n/LocaleProvider";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useMusicStore } from "@/features/music/store/useMusicStore";
import * as scenesApi from "@/features/scene/api/scenes";
import * as positionsApi from "@/features/scene/api/positions";
import { makeDancer, makeProject, makeScene } from "@/test/factories";

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));

/** 0 → 4 → 6 秒。移動時間は 4秒 と 2秒 */
const SCENES = [
  makeScene({ id: "a", orderIndex: 0, timeSeconds: 0 }),
  makeScene({ id: "b", orderIndex: 1, timeSeconds: 4 }),
  makeScene({ id: "c", orderIndex: 2, timeSeconds: 6 }),
];

function setup({
  isMetronomeEnabled,
  hasMusic = false,
  isPlaying = false,
}: {
  isMetronomeEnabled: boolean;
  hasMusic?: boolean;
  isPlaying?: boolean;
}) {
  const project = makeProject({ isMetronomeEnabled });
  useProjectStore.setState({ project, scenes: SCENES, positionsBySceneId: {} });
  useMusicStore.setState({
    objectUrl: hasMusic ? "blob:song" : null,
    // 曲の途中（6秒より後ろ）を聞いている状態
    currentTime: hasMusic ? 5 : 0,
  });
  // 先頭を選んだ状態で足す＝「間に割り込む」場面
  useUIStore.setState({ selectedSceneId: "a", isPlaying });

  return renderHook(() => useAddScene(project), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <LocaleProvider locale="ja">{children}</LocaleProvider>
    ),
  });
}

/** 時刻を、並んでいる順に読む */
const times = () =>
  useProjectStore.getState().scenes.map((scene) => scene.timeSeconds);

beforeEach(() => {
  // 作った行をそのまま返す API。中身は使わないが、型は満たしておく
  vi.spyOn(scenesApi, "createScene").mockImplementation(
    async (_supabase, scene) => scene,
  );
  vi.spyOn(scenesApi, "updateSceneBeats").mockResolvedValue(undefined);
  vi.spyOn(positionsApi, "upsertPositions").mockResolvedValue(undefined);
});
afterEach(() => vi.restoreAllMocks());

/**
 * 間に1つ足したときの、まわりの移動時間。
 * 直し方が2通りある（features/scene/lib/timelineMode）ので、
 * **どちらが選ばれるか**をここで縛る。
 */
describe("useAddScene の割り込み方", () => {
  /* **曲もクリックも無くても、答えは同じ**（2026-08-26）。
     以前はこの形だけ全部を積み直していた。カウントで組むようになって
     「そのカウントに置いた」こと自体が振付の意図になったので、
     触っていないシーンは動かさない。**積み直す枝を戻すと、ここが
     [0, 4, 8, 12] になって落ちる** */
  it("曲もクリックも無いときも、間へ割り込む（後ろは動かない）", async () => {
    const { result } = setup({ isMetronomeEnabled: false });

    await act(async () => {
      await result.current.addScene();
    });

    await waitFor(() => expect(times()).toEqual([0, 2, 4, 6]));
  });

  /**
   * **曲があっても、いま見ているシーンの次へ入れる**
   * （user の指示 2026-08-22:「シーンを追加する際は、必ず今表示している
   * シーンの次になるようにする」）。
   *
   * 以前は曲があるときだけ【押した瞬間の再生位置】へ置いていた。
   * 置き場所が曲の有無で変わるので、同じ操作の結果が読めなかった。
   */
  /**
   * 曲があるときは**鳴らしている最中しか押せない**（canAddScene）。
   * 画面側の3つの入口が、この答えを読んでボタンを押せなくしている。
   */
  it("曲があって止まっている間は、増やせない状態になる", () => {
    const { result } = setup({ isMetronomeEnabled: false, hasMusic: true });

    expect(result.current.canAdd).toBe(false);
  });

  it("曲が無ければ、止まっていても増やせる", () => {
    const { result } = setup({ isMetronomeEnabled: false });

    expect(result.current.canAdd).toBe(true);
  });

  /**
   * **鳴らしている最中は、押した瞬間の位置**（user の指示 2026-08-22:
   * 「再生している曲のシーン追加ボタンを押した際の曲のタイミングで、
   * シーンが登録されてほしい」）。
   *
   * 止まっているときと分けているのは、止まっている「いま」は誰にも
   * 見えないから。鳴っている間は聴いている位置がそのまま意図になる。
   */
  it("鳴らしている最中は、押した瞬間の再生位置へ入る", async () => {
    // 先頭(0秒)を選んだまま、曲の5秒目を鳴らしている
    const { result } = setup({
      isMetronomeEnabled: false,
      hasMusic: true,
      isPlaying: true,
    });

    await act(async () => {
      await result.current.addScene();
    });

    // 選んでいるシーンの次(2秒)ではなく、聴いている 5秒 に入る
    await waitFor(() => expect(times()).toEqual([0, 4, 5, 6]));
  });

  /* 拍があるときは、触っていないシーンを動かさないのが正しい
     （クリックに合わせて置いた隊形を守る）。そのぶん間隔は詰まる */
  it("拍があるときは、間へ割り込む（後ろは動かない）", async () => {
    const { result } = setup({ isMetronomeEnabled: true });

    await act(async () => {
      await result.current.addScene();
    });

    await waitFor(() => expect(times()).toEqual([0, 2, 4, 6]));
  });
});

/**
 * 曲があるときの、最初の1つ。
 *
 * **0秒に固定しない**（2026-08-22 に user が決めた仕様）。イントロが
 * 長い曲なら、振付が始まるのは0秒ではない。曲が無いときだけ、
 * 最初の隊形は「はじまり」＝0秒でよい。
 */
describe("useAddScene の、最初の1つ", () => {
  function setupEmpty({ hasMusic }: { hasMusic: boolean }) {
    const project = makeProject({ isMetronomeEnabled: false });
    useProjectStore.setState({
      project,
      scenes: [],
      positionsBySceneId: {},
    });
    useMusicStore.setState({
      objectUrl: hasMusic ? "blob:song" : null,
      currentTime: hasMusic ? 8 : 0,
    });
    useUIStore.setState({ selectedSceneId: null, isPlaying: hasMusic });

    return renderHook(() => useAddScene(project), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <LocaleProvider locale="ja">{children}</LocaleProvider>
      ),
    });
  }

  it("曲があるときは、鳴らしながら押した所にできる", async () => {
    const { result } = setupEmpty({ hasMusic: true });

    await act(async () => {
      await result.current.addScene();
    });

    await waitFor(() => expect(times()).toEqual([8]));
  });

  it("曲が無ければ、はじまり(0秒)にできる", async () => {
    const { result } = setupEmpty({ hasMusic: false });

    await act(async () => {
      await result.current.addScene();
    });

    await waitFor(() => expect(times()).toEqual([0]));
  });
});

/**
 * シーンを全部消しても、ダンサーは残る（作品に属するもので、シーンに
 * 属していない）。そこから1つ作ったとき、立ち位置を作らないと
 * **居るのに誰も描かれない**状態になっていた。
 *
 * user の指示（2026-08-22）:「シーン数を0にしてももともといたダンサーの
 * 情報は消去しないでください。シーン数が0の状態で新しくシーン追加した際は、
 * ダンサーは適当に配置された状態で大丈夫です」。
 */
describe("シーンが0の状態から作ったとき、ダンサーをどう置くか", () => {
  it("写す元が無ければ、空いているマスへ配る", async () => {
    const project = makeProject({ isMetronomeEnabled: false });
    useProjectStore.setState({
      project,
      scenes: [],
      positionsBySceneId: {},
      dancers: {
        "dancer-1": makeDancer({ id: "dancer-1" }),
        "dancer-2": makeDancer({ id: "dancer-2" }),
      },
    });
    useMusicStore.setState({ objectUrl: null });
    useUIStore.setState({ selectedSceneId: null, isPlaying: false });

    const { result } = renderHook(() => useAddScene(project), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <LocaleProvider locale="ja">{children}</LocaleProvider>
      ),
    });

    await act(async () => {
      await result.current.addScene();
    });

    const sceneId = useProjectStore.getState().scenes[0].id;
    const placed = Object.values(
      useProjectStore.getState().positionsBySceneId[sceneId] ?? {},
    );

    // 2人とも立ち位置を持っていて、同じ場所に重なっていない
    expect(placed).toHaveLength(2);
    const spots = placed.map((p) => `${p.xCoordinate},${p.yCoordinate}`);
    expect(new Set(spots).size).toBe(2);
  });
});
