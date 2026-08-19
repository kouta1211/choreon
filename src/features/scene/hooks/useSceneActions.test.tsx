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
  vi.spyOn(scenesApi, "updateSceneTimes").mockResolvedValue(undefined);
});
afterEach(() => vi.restoreAllMocks());

/**
 * 並び替えたときの時刻の直し方は2通りある（features/scene/lib/timelineMode）。
 * **どちらが選ばれるか**はこの1箇所で決まるので、ここで縛る。
 */
describe("useSceneActions の並び替え", () => {
  it("曲も拍も無いときは、全部を同じ秒数で積み直す", async () => {
    const { result } = setup({ isMetronomeEnabled: false });

    await act(async () => {
      await result.current.reorderTo(["a", "c", "b"]);
    });

    // 並びは a → c → b。間隔はどれも既定の 4秒
    await waitFor(() => expect(timesById()).toEqual({ a: 0, c: 4, b: 8 }));
  });

  /* 拍という物差しがあるときは、触っていないシーンを動かさないのが正しい
     （曲やクリックに合わせて置いた隊形を守る） */
  it("拍があるときは、動かした1つを新しい隣同士の中間へ置く", async () => {
    const { result } = setup({ isMetronomeEnabled: true });

    await act(async () => {
      await result.current.reorderTo(["a", "c", "b"]);
    });

    await waitFor(() => expect(timesById()).toEqual({ a: 0, c: 2, b: 4 }));
  });
});
