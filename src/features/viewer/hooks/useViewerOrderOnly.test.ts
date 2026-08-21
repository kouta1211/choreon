import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { useViewerOrderOnly } from "./useViewerOrderOnly";
import { useViewerStore } from "@/features/viewer/store/useViewerStore";
import { makeProject } from "@/test/factories";

/**
 * **見る側では、この端末に音源が無いのが普通**（共有リンクに曲は
 * 付いていかない）。作る側と同じ見方をすると、曲に合わせて組んだ作品まで
 * 「順番だけ」になり、時刻を出す意味がある画面から時刻が消える。
 */
import type { Project } from "@/features/project/types";

function set(project: Project | null) {
  useViewerStore.setState({ project });
}

describe("useViewerOrderOnly", () => {
  it("曲の名前が残っていれば、順番だけではない（音源が手元に無くても）", () => {
    set(makeProject({ musicTitle: "song.mp3" }));

    expect(renderHook(() => useViewerOrderOnly()).result.current).toBe(false);
  });

  it("曲もメトロノームも無ければ、順番だけ", () => {
    set(makeProject({ musicTitle: null, isMetronomeEnabled: false }));

    expect(renderHook(() => useViewerOrderOnly()).result.current).toBe(true);
  });

  it("曲が無くてもメトロノームがあれば、順番だけではない", () => {
    set(makeProject({ musicTitle: null, isMetronomeEnabled: true }));

    expect(renderHook(() => useViewerOrderOnly()).result.current).toBe(false);
  });

  it("作品がまだ入っていないときは、順番だけとは言わない", () => {
    set(null);

    expect(renderHook(() => useViewerOrderOnly()).result.current).toBe(false);
  });
});
