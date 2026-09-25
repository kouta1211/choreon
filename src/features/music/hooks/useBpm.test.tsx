import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useBpm } from "./useBpm";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import * as projectsApi from "@/features/project/api/projects";
import { makeProject, makeScene } from "@/test/factories";

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));

/**
 * **速さを変えたら、拍→秒の写像も保存する。**
 *
 * 時間の物差しの正は `music_placements`（`placement.ts`）で、
 * `projects.bpm` の列は**同じことを言うもう1つの口**。ストアの `setBpm`
 * は載せ方を引き直しているのに、保存の側が `bpm` 列しか書かないと、
 * **開き直した瞬間に載せ方だけ古い速さへ戻る**。
 *
 * 画面は「BPM 90」と出したまま、コマの間隔は 120 のもの、という
 * 壊れ方になる（.claude/rules/state.md 7節「同じ問いに答える口を
 * 2つ置かない」の、保存側での現れ方）。
 */
const setup = () => {
  useProjectStore.setState({
    project: makeProject({ bpm: 120 }),
    scenes: [makeScene({ positionBeats: 0 }), makeScene({ id: "s2", positionBeats: 16 })],
    isGuest: false,
  });
  return renderHook(() => useBpm());
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useBpm", () => {
  it("速さを変えたら、bpm の列を保存する", async () => {
    const saveBpm = vi
      .spyOn(projectsApi, "updateProjectBpm")
      .mockResolvedValue(undefined);
    vi.spyOn(projectsApi, "updateMusicPlacements").mockResolvedValue(undefined);

    const { result } = setup();
    act(() => result.current.setBpm(90));

    await waitFor(() =>
      expect(saveBpm).toHaveBeenCalledWith(expect.anything(), "project-1", 90),
    );
  });

  /* **ここが歯。** 載せ方を保存しないと、開き直したとき秒だけ戻る */
  it("速さを変えたら、引き直した載せ方も保存する", async () => {
    vi.spyOn(projectsApi, "updateProjectBpm").mockResolvedValue(undefined);
    const savePlacements = vi
      .spyOn(projectsApi, "updateMusicPlacements")
      .mockResolvedValue(undefined);

    const { result } = setup();
    act(() => result.current.setBpm(90));

    await waitFor(() => expect(savePlacements).toHaveBeenCalled());

    const saved = savePlacements.mock.calls[0]?.[2];
    // BPM 90 = 1拍 0.666…秒。120 のままの 0.5 が保存されたら不具合
    expect(saved?.[0].secondsPerBeat).toBeCloseTo(60 / 90, 6);
  });

  it("同じ速さを入れ直したときは、何も保存しない", async () => {
    const saveBpm = vi
      .spyOn(projectsApi, "updateProjectBpm")
      .mockResolvedValue(undefined);
    const savePlacements = vi
      .spyOn(projectsApi, "updateMusicPlacements")
      .mockResolvedValue(undefined);

    const { result } = setup();
    act(() => result.current.setBpm(120));

    expect(saveBpm).not.toHaveBeenCalled();
    expect(savePlacements).not.toHaveBeenCalled();
  });
});
