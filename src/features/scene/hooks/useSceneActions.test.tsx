import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { useSceneActions } from "./useSceneActions";
import { LocaleProvider } from "@/features/i18n/LocaleProvider";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useMusicStore } from "@/features/music/store/useMusicStore";
import * as scenesApi from "@/features/scene/api/scenes";
import { makeProject, makeScene } from "@/test/factories";

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
