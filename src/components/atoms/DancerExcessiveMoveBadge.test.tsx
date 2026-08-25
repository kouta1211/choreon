import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { DancerExcessiveMoveBadge } from "./DancerExcessiveMoveBadge";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useHistoryStore } from "@/features/canvas/store/useHistoryStore";
import { useHistoryActions } from "@/features/canvas/hooks/useHistoryActions";
import { measureMove } from "@/features/canvas/lib/physicalLimits";
import * as scenesApi from "@/features/scene/api/scenes";
import { makeDancer, makeProject, makeScene } from "@/test/factories";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({}),
}));

/**
 * 「移動が速すぎます」の直しを、その場で当てられるようにしたぶんのテスト。
 *
 * ここで守りたいのは3つ。
 *   1. **押されるまで何も起きない**（意図した速さなら直さない、を選べる）
 *   2. 押すと、歩ける速さになる秒数まで延びる（警告が消えるだけにしない）
 *   3. 当てたあと**元に戻す1回**で消える
 *
 * 3 は、実装前は成り立っていなかった（シーンの時刻は履歴を通っていなかった）。
 * 「取り入れるかどうかを最後に決める」形は、戻せて初めて成り立つ。
 */
const SCENE_1 = makeScene({ id: "s1", name: "シーン1", timeSeconds: 0 });
const SCENE_2 = makeScene({ id: "s2", name: "シーン2", timeSeconds: 0.6 });

/** 0,1 → 8,1（7.2m）を 0.6秒。12m/s なので確実に警告が出る */
const FAR = { xCoordinate: 8, yCoordinate: 1 };
const NEAR = { xCoordinate: 0, yCoordinate: 1 };
const STRAIN = measureMove(NEAR, FAR, 0.6);

function setUp(scenes = [SCENE_1, SCENE_2]) {
  useProjectStore.setState({
    isGuest: false,
    project: makeProject(),
    scenes,
    dancers: { d1: makeDancer({ id: "d1", name: "1" }) },
    positionsBySceneId: {},
  });
  useUIStore.setState({ selectedSceneId: "s1" });
  useHistoryStore.setState({ past: [], future: [] });
}

/** 長押し(450ms)で説明を開く。マウスのホバーでも開くが、待ち時間が違う */
async function openPopover() {
  const badge = screen.getByTestId("dancer-excessive-move-badge");
  await act(async () => {
    badge.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, pointerType: "touch" }),
    );
    vi.advanceTimersByTime(500);
  });
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  setUp();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("DancerExcessiveMoveBadge の直し", () => {
  it("説明を開くと、延ばす秒数が出る", async () => {
    render(<DancerExcessiveMoveBadge strain={STRAIN} dancerName="1" />);

    await openPopover();

    // 7.2m を歩ける速さ(1.8m/s)なら 4秒。上限(3.5m/s)なら 2.5秒 —
    // 走らされたままにならない側を出す
    expect(screen.getByText("4秒に延ばす")).toBeInTheDocument();
  });

  /** ここが要点。読んで「意図した速さだ」と決められる */
  it("開いただけでは、時刻は動かない", async () => {
    const spy = vi.spyOn(scenesApi, "updateSceneBeats");
    render(<DancerExcessiveMoveBadge strain={STRAIN} dancerName="1" />);

    await openPopover();

    expect(spy).not.toHaveBeenCalled();
    expect(useProjectStore.getState().scenes[1].timeSeconds).toBe(0.6);
  });

  it("押すと、次のシーンがその秒数まで後ろへ動く", async () => {
    vi.spyOn(scenesApi, "updateSceneBeats").mockResolvedValue(undefined);
    render(<DancerExcessiveMoveBadge strain={STRAIN} dancerName="1" />);

    await openPopover();
    await act(async () => {
      screen.getByText("4秒に延ばす").click();
    });

    await waitFor(() => {
      expect(useProjectStore.getState().scenes[1].timeSeconds).toBe(4);
    });
  });

  it("押したあと、その移動はもう警告が出る速さではない", async () => {
    vi.spyOn(scenesApi, "updateSceneBeats").mockResolvedValue(undefined);
    render(<DancerExcessiveMoveBadge strain={STRAIN} dancerName="1" />);

    await openPopover();
    await act(async () => {
      screen.getByText("4秒に延ばす").click();
    });

    await waitFor(() => {
      const seconds =
        useProjectStore.getState().scenes[1].timeSeconds -
        useProjectStore.getState().scenes[0].timeSeconds;
      expect(measureMove(NEAR, FAR, seconds).isExcessive).toBe(false);
    });
  });

  /**
   * 実装前はここが成り立っていなかった。時刻の変更は履歴を通っておらず、
   * 当てたら手で打ち直すしかなかった。
   */
  it("当てたものは、元に戻す1回で消える", async () => {
    vi.spyOn(scenesApi, "updateSceneBeats").mockResolvedValue(undefined);

    function Harness() {
      const { undo } = useHistoryActions();
      return (
        <>
          <DancerExcessiveMoveBadge strain={STRAIN} dancerName="1" />
          <button onClick={() => void undo()}>元に戻す</button>
        </>
      );
    }
    render(<Harness />);

    await openPopover();
    await act(async () => {
      screen.getByText("4秒に延ばす").click();
    });
    await waitFor(() => {
      expect(useProjectStore.getState().scenes[1].timeSeconds).toBe(4);
    });
    expect(useHistoryStore.getState().past).toHaveLength(1);

    await act(async () => {
      screen.getByText("元に戻す").click();
    });

    await waitFor(() => {
      expect(useProjectStore.getState().scenes[1].timeSeconds).toBe(0.6);
    });
  });

  /** 最後のシーンには「次」が無いので、延ばす先が無い */
  it("最後のシーンでは、直しのボタンを出さない", async () => {
    useUIStore.setState({ selectedSceneId: "s2" });
    render(<DancerExcessiveMoveBadge strain={STRAIN} dancerName="1" />);

    await openPopover();

    expect(screen.queryByText(/秒に延ばす/)).not.toBeInTheDocument();
    // 指摘そのものは出る
    expect(screen.getByText("移動が速すぎます")).toBeInTheDocument();
  });

  it("既に十分な時間があるなら、延ばす提案はしない", async () => {
    const gentle = measureMove(NEAR, FAR, 10);
    render(<DancerExcessiveMoveBadge strain={gentle} dancerName="1" />);

    await openPopover();

    expect(screen.queryByText(/秒に延ばす/)).not.toBeInTheDocument();
  });
});
