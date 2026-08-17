import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { DancerBlindSpotBadge } from "./DancerBlindSpotBadge";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useHistoryStore } from "@/features/canvas/store/useHistoryStore";
import { useHistoryActions } from "@/features/canvas/hooks/useHistoryActions";
import { findBlockedDancerIds } from "@/features/canvas/lib/blindSpot";
import * as positionsApi from "@/features/scene/api/positions";
import { makeDancer, makeProject, makeScene } from "@/test/factories";
import type { Position } from "@/features/scene/types";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({}),
}));

/**
 * 顔被りの直しを、その場で当てられるようにしたぶんのテスト。
 *
 * ここで守りたいのは「移動が速すぎます」と同じ3つ。
 *   1. **押されるまで何も起きない**（わざと重ねている振付もある）
 *   2. 押すと、もう隠れていない位置へ横だけ動く
 *   3. 元に戻す1回で消える
 *
 * 逃げ先は AI ではなく**アプリが計算する**(blindSpot.ts)。ここが
 * この機能全体の一線なので、当たった先が本当に隠れていないことを見る。
 */
function position(dancerId: string, x: number, y: number): Position {
  return {
    sceneId: "s1",
    dancerId,
    xCoordinate: x,
    yCoordinate: y,
    rotationAngle: 0,
    curveControlX: null,
    curveControlY: null,
    transitionDurationSeconds: null,
  } as Position;
}

/** 5,1(奥) が 5,5(手前) の真後ろ。客席から見て隠れる */
const BLOCKED = position("blocked", 5, 1);
const FRONT = position("front", 5, 5);

function setUp(positions: Record<string, Position> = {
  blocked: BLOCKED,
  front: FRONT,
}) {
  useProjectStore.setState({
    isGuest: false,
    project: makeProject({ stageWidth: 10, stageHeight: 10 }),
    scenes: [makeScene({ id: "s1", timeSeconds: 0 })],
    dancers: {
      blocked: makeDancer({ id: "blocked", name: "8" }),
      front: makeDancer({ id: "front", name: "2" }),
    },
    positionsBySceneId: { s1: positions },
  });
  useUIStore.setState({ selectedSceneId: "s1" });
  useHistoryStore.setState({ past: [], future: [] });
}

async function openPopover() {
  const badge = screen.getByTestId("dancer-blind-spot-badge");
  await act(async () => {
    badge.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, pointerType: "touch" }),
    );
    vi.advanceTimersByTime(500);
  });
}

const currentX = () =>
  useProjectStore.getState().positionsBySceneId.s1.blocked.xCoordinate;
const currentY = () =>
  useProjectStore.getState().positionsBySceneId.s1.blocked.yCoordinate;

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  setUp();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("DancerBlindSpotBadge の直し", () => {
  it("説明に「横へずらして顔を出す」が出る", async () => {
    render(<DancerBlindSpotBadge dancerName="8" dancerId="blocked" />);

    await openPopover();

    expect(screen.getByText("横へずらして顔を出す")).toBeInTheDocument();
  });

  /** わざと重ねている振付（前の人の影から出てくる）もあるので勝手に直さない */
  it("開いただけでは動かない", async () => {
    const spy = vi.spyOn(positionsApi, "upsertPositions");
    render(<DancerBlindSpotBadge dancerName="8" dancerId="blocked" />);

    await openPopover();

    expect(spy).not.toHaveBeenCalled();
    expect(currentX()).toBe(5);
  });

  it("押すと、もう隠れていない位置へ動く", async () => {
    vi.spyOn(positionsApi, "upsertPositions").mockResolvedValue(undefined);
    render(<DancerBlindSpotBadge dancerName="8" dancerId="blocked" />);

    await openPopover();
    await act(async () => {
      screen.getByText("横へずらして顔を出す").click();
    });

    await waitFor(() => {
      expect(currentX()).not.toBe(5);
    });
    // 当たった先が本当に顔を出しているか。ここが計算の答え合わせ
    const blocked = findBlockedDancerIds({
      blocked: { xCoordinate: currentX(), yCoordinate: currentY() },
      front: FRONT,
    });
    expect(blocked.has("blocked")).toBe(false);
  });

  /** 奥行きを変えると列の並びそのものが変わる。横だけ動かす */
  it("前後には動かさない", async () => {
    vi.spyOn(positionsApi, "upsertPositions").mockResolvedValue(undefined);
    render(<DancerBlindSpotBadge dancerName="8" dancerId="blocked" />);

    await openPopover();
    await act(async () => {
      screen.getByText("横へずらして顔を出す").click();
    });

    await waitFor(() => {
      expect(currentX()).not.toBe(5);
    });
    expect(currentY()).toBe(1);
  });

  it("当てたものは、元に戻す1回で消える", async () => {
    vi.spyOn(positionsApi, "upsertPositions").mockResolvedValue(undefined);

    function Harness() {
      const { undo } = useHistoryActions();
      return (
        <>
          <DancerBlindSpotBadge dancerName="8" dancerId="blocked" />
          <button onClick={() => void undo()}>元に戻す</button>
        </>
      );
    }
    render(<Harness />);

    await openPopover();
    await act(async () => {
      screen.getByText("横へずらして顔を出す").click();
    });
    await waitFor(() => {
      expect(currentX()).not.toBe(5);
    });

    await act(async () => {
      screen.getByText("元に戻す").click();
    });

    await waitFor(() => {
      expect(currentX()).toBe(5);
    });
  });

  /** 前が塞がりきっているときは、押しても動けない */
  it("逃げ場が無ければ、ボタンを出さない", async () => {
    setUp({
      blocked: position("blocked", 0.5, 1),
      a: position("a", 0, 5),
      b: position("b", 0.5, 5),
      c: position("c", 1, 5),
    });
    useProjectStore.setState({
      project: makeProject({ stageWidth: 1, stageHeight: 10 }),
    });

    render(<DancerBlindSpotBadge dancerName="8" dancerId="blocked" />);
    await openPopover();

    expect(screen.queryByText("横へずらして顔を出す")).not.toBeInTheDocument();
    // 指摘そのものは出る
    expect(screen.getByText("顔被りチェック")).toBeInTheDocument();
  });
});
