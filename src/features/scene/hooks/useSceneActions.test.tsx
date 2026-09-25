import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { useSceneActions } from "./useSceneActions";
import { LocaleProvider } from "@/features/i18n/LocaleProvider";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useMusicStore } from "@/features/music/store/useMusicStore";
import * as scenesApi from "@/features/scene/api/scenes";
import { makeProject, makeScene } from "@/test/factories";
import { bareCountLabelAtBeat } from "@/features/music/lib/countLabel";
import { withDerivedTimes } from "@/features/music/lib/placement";

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));

/** 0 → 4 → 6 秒。移動時間は 4秒 と 2秒 */
const SCENES = [
  makeScene({ id: "a", orderIndex: 0, timeSeconds: 0 }),
  makeScene({ id: "b", orderIndex: 1, timeSeconds: 4 }),
  makeScene({ id: "c", orderIndex: 2, timeSeconds: 6 }),
];

function setup({ isMetronomeEnabled }: { isMetronomeEnabled: boolean }) {
  useProjectStore.setState({
    project: makeProject({ isMetronomeEnabled }),
    scenes: SCENES,
  });
  useMusicStore.setState({ objectUrl: null });

  return renderHook(() => useSceneActions(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <LocaleProvider locale="ja">{children}</LocaleProvider>
    ),
  });
}

const timesById = () =>
  Object.fromEntries(
    useProjectStore.getState().scenes.map((s) => [s.id, s.timeSeconds]),
  );

beforeEach(() => {
  vi.spyOn(scenesApi, "updateSceneBeats").mockResolvedValue(undefined);
});
afterEach(() => vi.restoreAllMocks());

/**
 * 並び替えたときの直し方は**1通りだけ**（2026-08-26）。
 *
 * 以前は「合わせる相手が無い作品」だけ全部を積み直していた。
 * カウントで組むようになって **`3-5` に置いたこと自体が振付の意図**に
 * なったので、触っていないシーンを動かさない側へ一本化した。
 *
 * **曲やクリックの有無で答えが分かれないこと**を縛る — 分岐を戻すと
 * 片方が落ちる。
 */
describe("useSceneActions の並び替え", () => {
  it("動かした1つを、新しい隣同士の中間へ置く", async () => {
    const { result } = setup({ isMetronomeEnabled: true });

    await act(async () => {
      await result.current.reorderTo(["a", "c", "b"]);
    });

    await waitFor(() => expect(timesById()).toEqual({ a: 0, c: 2, b: 4 }));
  });

  /* **曲もクリックも無くても、答えは同じ。** 積み直す枝を戻すと、
     ここが { a: 0, c: 4, b: 8 } になって落ちる */
  it("曲もクリックも無いときも、同じ直し方をする", async () => {
    const { result } = setup({ isMetronomeEnabled: false });

    await act(async () => {
      await result.current.reorderTo(["a", "c", "b"]);
    });

    await waitFor(() => expect(timesById()).toEqual({ a: 0, c: 2, b: 4 }));
  });
});

/**
 * **打った数と、画面に出る数を食い違わせない**
 * （user の報告 2026-09-25「12-1 にしても 11-8 になってしまうことがある」）。
 *
 * 原因は **拍 → 秒 → 拍 の往復**。欄は `12-1` を拍 88（整数）まで読めて
 * いるのに、確定の道が一度**秒へ直し、1ミリ秒の格子へ丸めて**から拍へ
 * 割り戻していた。BPM 130 なら 88拍 = 40.615秒 で、割り戻すと
 * 87.99916… になる。`countAtBeat` は切り捨てるので **11-8** になる。
 *
 * 曲が無いときは 1拍 0.5秒ちょうどなので往復しても戻る。だから
 * **曲を入れて速さを決めたあとだけ**起きた。整数の BPM 261通りのうち
 * 111通りがこれに当たる（`counts.ts` が「秒を経由しない」と書いた理由）。
 *
 * **札の側まで見る。** 拍が 87.99916 でも「ほぼ 88」なので、数の比較だけ
 * だと近似で通してしまいたくなる。user が見ているのは札なので、
 * そこを縛る。
 */
describe("useSceneActions のカウントの打ち込み", () => {
  /** 88拍 = 40.615秒。割り戻すと 87.99916… で、切り捨てると 87拍 */
  const BROKEN_BPM = 130;
  /** 12セット目の1カウント = (12-1) * 8 = 88拍 */
  const BEAT_12_1 = 88;

  function setupCounts() {
    const project = makeProject({ bpm: BROKEN_BPM });
    useProjectStore.setState({
      project,
      scenes: withDerivedTimes(
        [
          { ...makeScene({ id: "a", orderIndex: 0 }), positionBeats: 0 },
          { ...makeScene({ id: "b", orderIndex: 1 }), positionBeats: 8 },
        ],
        project.musicPlacements,
      ),
    });
    useMusicStore.setState({ objectUrl: "blob:song" });

    return renderHook(() => useSceneActions(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <LocaleProvider locale="ja">{children}</LocaleProvider>
      ),
    });
  }

  const sceneB = () =>
    useProjectStore.getState().scenes.find((s) => s.id === "b")!;

  it("打った 12-1 が、拍のまま残る", async () => {
    const { result } = setupCounts();

    await act(async () => {
      await result.current.changeSceneBeats(sceneB(), BEAT_12_1);
    });

    await waitFor(() => expect(sceneB().positionBeats).toBe(BEAT_12_1));
  });

  /* **user が見ているのはここ。** 拍が 87.99916 だと 11-8 と出る */
  it("画面に出る札も 12-1 のまま", async () => {
    const { result } = setupCounts();

    await act(async () => {
      await result.current.changeSceneBeats(sceneB(), BEAT_12_1);
    });

    await waitFor(() =>
      expect(
        bareCountLabelAtBeat(
          sceneB().positionBeats,
          useProjectStore.getState().project!.musicPlacements,
        ),
      ).toBe("12-1"),
    );
  });
});
