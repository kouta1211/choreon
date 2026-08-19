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
import { makeProject, makeScene } from "@/test/factories";

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));

/** 0 → 4 → 6 秒。移動時間は 4秒 と 2秒 */
const SCENES = [
  makeScene({ id: "a", orderIndex: 0, timeSeconds: 0 }),
  makeScene({ id: "b", orderIndex: 1, timeSeconds: 4 }),
  makeScene({ id: "c", orderIndex: 2, timeSeconds: 6 }),
];

function setup({ isMetronomeEnabled }: { isMetronomeEnabled: boolean }) {
  const project = makeProject({ isMetronomeEnabled });
  useProjectStore.setState({ project, scenes: SCENES, positionsBySceneId: {} });
  useMusicStore.setState({ objectUrl: null });
  // 先頭を選んだ状態で足す＝「間に割り込む」場面
  useUIStore.setState({ selectedSceneId: "a" });

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
  vi.spyOn(scenesApi, "updateSceneTimes").mockResolvedValue(undefined);
  vi.spyOn(positionsApi, "upsertPositions").mockResolvedValue(undefined);
});
afterEach(() => vi.restoreAllMocks());

/**
 * 間に1つ足したときの、まわりの移動時間。
 * 直し方が2通りある（features/scene/lib/timelineMode）ので、
 * **どちらが選ばれるか**をここで縛る。
 */
describe("useAddScene の割り込み方", () => {
  it("曲も拍も無いときは、後ろを押しのけて足す（秒数が変わらない）", async () => {
    const { result } = setup({ isMetronomeEnabled: false });

    await act(async () => {
      await result.current.addScene();
    });

    // 0 →(4) 新 →(4) b →(2) c。元の 4秒 と 2秒 が保たれている
    await waitFor(() => expect(times()).toEqual([0, 4, 8, 10]));
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
