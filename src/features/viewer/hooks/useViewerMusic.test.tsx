import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useViewerMusic } from "./useViewerMusic";
import { useViewerStore } from "@/features/viewer/store/useViewerStore";
import * as sharedTrackApi from "@/features/music/api/sharedTrack";
import * as musicStorage from "@/features/music/lib/musicStorage";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({}),
}));

/**
 * **見る人の端末で曲を鳴らす**（2026-09-26）。保守点検 #16 で
 * 「テストが無い」と報告された（2026-09-29 に追加）。
 *
 * ここで縛るのは、壊れても**目では気づきにくい**もの:
 * - 開いただけでは落とさない（通信量）・2回目は控えから（通信しない）
 * - 落とせなかったら、音を諦めて rAF の時計へ返す（画面が止まらない）
 * - 最後のシーンで止まる
 */

/** rAF を手で進める。進める時点はこちらが決める */
function useManualFrames() {
  const callbacks: FrameRequestCallback[] = [];
  vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((cb) => {
    callbacks.push(cb);
    return callbacks.length;
  });
  vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation(() => {});
  return {
    advance() {
      const pending = callbacks.splice(0, callbacks.length);
      for (const cb of pending) cb(performance.now());
    },
  };
}

/** `<audio>` の代わり。触る所だけ持たせる */
function fakeAudio(play: () => Promise<void> = () => Promise.resolve()) {
  return {
    currentTime: 0,
    ended: false,
    play: vi.fn(play),
    pause: vi.fn(),
  };
}

const SONG = new File(["x"], "abc.mp3", { type: "audio/mpeg" });

beforeEach(() => {
  // jsdom には無い
  URL.createObjectURL = vi.fn(() => "blob:song");
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
  useViewerStore.setState({ currentSeconds: 0, isPlaying: false });
});

function render(musicPath: string | null, lastSeconds = 60) {
  return renderHook(() =>
    useViewerMusic({ projectId: "p1", musicPath, lastSeconds }),
  );
}

describe("useViewerMusic", () => {
  it("配られていない作品は none で、押しても何もしない", async () => {
    const download = vi.spyOn(sharedTrackApi, "downloadSharedTrack");
    const { result } = render(null);

    expect(result.current.status).toBe("none");
    await act(() => result.current.ensureLoaded());

    expect(download).not.toHaveBeenCalled();
    expect(result.current.isDrivingClock).toBe(false);
  });

  it("開いただけでは落としに行かない", async () => {
    const download = vi.spyOn(sharedTrackApi, "downloadSharedTrack");
    const cached = vi.spyOn(musicStorage, "loadSharedTrack");
    const { result } = render("p1/abc.mp3");

    /* 否定のテストは待ってから見る（落とす処理は非同期） */
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(result.current.status).toBe("idle");
    expect(cached).not.toHaveBeenCalled();
    expect(download).not.toHaveBeenCalled();
  });

  it("控えがあれば、通信せずに鳴らせる", async () => {
    vi.spyOn(musicStorage, "loadSharedTrack").mockResolvedValue({
      file: SONG,
      fileName: "",
    });
    const download = vi.spyOn(sharedTrackApi, "downloadSharedTrack");
    const { result } = render("p1/abc.mp3");

    await act(() => result.current.ensureLoaded());

    expect(result.current.status).toBe("ready");
    expect(result.current.isDrivingClock).toBe(true);
    expect(download).not.toHaveBeenCalled();
  });

  it("控えが無ければ落として、端末へ控える", async () => {
    vi.spyOn(musicStorage, "loadSharedTrack").mockResolvedValue(null);
    const save = vi
      .spyOn(musicStorage, "saveSharedTrack")
      .mockResolvedValue(undefined);
    const download = vi
      .spyOn(sharedTrackApi, "downloadSharedTrack")
      .mockResolvedValue(SONG);
    const { result } = render("p1/abc.mp3");

    await act(() => result.current.ensureLoaded());

    expect(download).toHaveBeenCalledWith(expect.anything(), "p1/abc.mp3");
    expect(save).toHaveBeenCalledWith("p1", expect.objectContaining({ fileName: "" }));
    expect(result.current.status).toBe("ready");
  });

  /* 共有をやめられた・圏外。**画面は rAF の時計で動き続ける** */
  it("落とせなければ failed で、曲は時計にならない", async () => {
    vi.spyOn(musicStorage, "loadSharedTrack").mockResolvedValue(null);
    vi.spyOn(sharedTrackApi, "downloadSharedTrack").mockRejectedValue(
      new Error("403"),
    );
    const { result } = render("p1/abc.mp3");

    await act(() => result.current.ensureLoaded());

    expect(result.current.status).toBe("failed");
    expect(result.current.isDrivingClock).toBe(false);
  });

  /* 自動再生を止められたとき、黙ると画面が止まったまま動かなくなる */
  it("鳴らせなかったら、rAF の時計へ返す", async () => {
    useManualFrames();
    vi.spyOn(musicStorage, "loadSharedTrack").mockResolvedValue({
      file: SONG,
      fileName: "",
    });
    const { result } = render("p1/abc.mp3");
    const audio = fakeAudio(() => Promise.reject(new Error("NotAllowed")));
    result.current.audioRef.current = audio as unknown as HTMLAudioElement;

    await act(() => result.current.ensureLoaded());
    act(() => useViewerStore.setState({ isPlaying: true }));

    await waitFor(() => expect(result.current.isDrivingClock).toBe(false));
    expect(result.current.status).toBe("failed");
  });

  it("鳴っている間は、曲の時刻を書き出し、最後のシーンで止める", async () => {
    const frames = useManualFrames();
    vi.spyOn(musicStorage, "loadSharedTrack").mockResolvedValue({
      file: SONG,
      fileName: "",
    });
    const { result } = render("p1/abc.mp3", 30);
    const audio = fakeAudio();
    result.current.audioRef.current = audio as unknown as HTMLAudioElement;

    await act(() => result.current.ensureLoaded());
    act(() => useViewerStore.setState({ isPlaying: true, currentSeconds: 0 }));
    expect(audio.play).toHaveBeenCalled();

    audio.currentTime = 0.05;
    act(() => frames.advance());
    expect(useViewerStore.getState().currentSeconds).toBe(0.05);

    audio.currentTime = 30.2;
    useViewerStore.setState({ currentSeconds: 30.2 });
    act(() => frames.advance());

    expect(useViewerStore.getState().isPlaying).toBe(false);
    expect(useViewerStore.getState().currentSeconds).toBe(30);
  });
});
