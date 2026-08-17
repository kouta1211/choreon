import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { AssistSheet } from "./AssistSheet";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useHistoryStore } from "@/features/canvas/store/useHistoryStore";
import { findBlockedDancerIds } from "@/features/canvas/lib/blindSpot";
import * as positionsApi from "@/features/scene/api/positions";
import * as scenesApi from "@/features/scene/api/scenes";
import { makeDancer, makeProject, makeScene } from "@/test/factories";
import type { Position } from "@/features/scene/types";
import type { AssistResult } from "@/features/assist/lib/actions";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({}),
}));

/**
 * 言葉で頼む画面。
 *
 * ここで守りたいのは4つ。
 *   1. **確認に出る数字はアプリの計算**（AI は操作の名前しか返さない）
 *   2. **押すまで何も起きない**（読んで見送れる）
 *   3. 表示の切り替えは確認せず、すぐ済ませて結果だけ言う
 *   4. **できないことを「やりました」と言わない**
 *
 * 4 がこの種の機能でいちばん困る壊れ方。アプリが実行できたことしか
 * 済んだと言わない。
 */
const PROJECT = makeProject({ stageWidth: 10, stageHeight: 10 });

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
const HIDDEN = {
  blocked: position("blocked", 5, 1),
  front: position("front", 5, 5),
};

function setUp(
  options: {
    positions?: Record<string, Position>;
    nextPositions?: Record<string, Position>;
  } = {},
) {
  useProjectStore.setState({
    isGuest: false,
    project: PROJECT,
    scenes: [
      makeScene({ id: "s1", name: "シーン1", timeSeconds: 0 }),
      makeScene({ id: "s2", name: "シーン2", timeSeconds: 0.6 }),
    ],
    dancers: {
      blocked: makeDancer({ id: "blocked", name: "8" }),
      front: makeDancer({ id: "front", name: "2" }),
    },
    positionsBySceneId: {
      s1: options.positions ?? HIDDEN,
      s2: options.nextPositions ?? options.positions ?? HIDDEN,
    },
  });
  useUIStore.setState({
    selectedSceneId: "s1",
    isStageMarksVisible: false,
    isPathVisible: false,
    isBlindSpotCheckVisible: false,
  });
  useHistoryStore.setState({ past: [], future: [] });
}

/** /api/assist の返事を差し替える。上流には一切触らない */
function replyWith(assist: AssistResult) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, json: async () => ({ assist }) }),
  );
}

async function askFor(text: string) {
  const input = screen.getByLabelText("したいこと");
  await act(async () => {
    input.focus();
    // React の value を更新する（controlled input）
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    )?.set;
    setter?.call(input, text);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await act(async () => {
    screen.getByText("頼む").click();
  });
}

const blockedX = () =>
  useProjectStore.getState().positionsBySceneId.s1.blocked.xCoordinate;

const noop = () => {};

beforeEach(() => {
  setUp();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("AssistSheet", () => {
  it("何を書けばいいか、例を出す", () => {
    replyWith({ action: { kind: "none" }, reply: "" });
    render(
      <AssistSheet
        project={PROJECT}
        isOpen
        onClose={noop}
        onOpenSheet={noop}
      />,
    );

    expect(screen.getByText("顔被りを全部直して")).toBeInTheDocument();
  });

  /** ★1: 数字はアプリが計算する。返事には入っていない */
  it("確認に、アプリが計算した動かし先が出る", async () => {
    replyWith({ action: { kind: "clearBlindSpots" }, reply: "" });
    render(
      <AssistSheet
        project={PROJECT}
        isOpen
        onClose={noop}
        onOpenSheet={noop}
      />,
    );

    await askFor("顔被りを全部直して");

    await waitFor(() => {
      expect(screen.getByTestId("assist-plan")).toBeInTheDocument();
    });
    expect(screen.getByText("顔被りを直す（1人）")).toBeInTheDocument();
    /* 4.4 は clearBlindSpotX が出した数（肩の半幅0.45＋顔0.09＋余白0.1 を
       5 から引いた 4.36 の丸め）。**返事には入っていない** */
    expect(screen.getByText(/8番を 5 → 4.4 へ/)).toBeInTheDocument();
    expect(
      screen.getByText("いま開いているシーンだけ。前後は動きません"),
    ).toBeInTheDocument();
  });

  /** ★2: 読んで見送れる */
  it("確認が出ただけでは、隊形は動かない", async () => {
    const spy = vi.spyOn(positionsApi, "upsertPositions");
    replyWith({ action: { kind: "clearBlindSpots" }, reply: "" });
    render(
      <AssistSheet
        project={PROJECT}
        isOpen
        onClose={noop}
        onOpenSheet={noop}
      />,
    );

    await askFor("顔被りを全部直して");
    await waitFor(() => {
      expect(screen.getByTestId("assist-plan")).toBeInTheDocument();
    });

    expect(spy).not.toHaveBeenCalled();
    expect(blockedX()).toBe(5);
  });

  it("「これで進める」を押すと、顔が出る位置へ動く", async () => {
    vi.spyOn(positionsApi, "upsertPositions").mockResolvedValue(undefined);
    replyWith({ action: { kind: "clearBlindSpots" }, reply: "" });
    render(
      <AssistSheet
        project={PROJECT}
        isOpen
        onClose={noop}
        onOpenSheet={noop}
      />,
    );

    await askFor("顔被りを全部直して");
    await waitFor(() => {
      expect(screen.getByTestId("assist-plan")).toBeInTheDocument();
    });
    await act(async () => {
      screen.getByText("これで進める").click();
    });

    await waitFor(() => {
      expect(blockedX()).not.toBe(5);
    });
    // 当たった先が本当に顔を出しているか
    const stillBlocked = findBlockedDancerIds({
      blocked: { xCoordinate: blockedX(), yCoordinate: 1 },
      front: HIDDEN.front,
    });
    expect(stillBlocked.has("blocked")).toBe(false);
  });

  it("「やめる」を押すと、何も起きない", async () => {
    const spy = vi.spyOn(positionsApi, "upsertPositions");
    replyWith({ action: { kind: "clearBlindSpots" }, reply: "" });
    render(
      <AssistSheet
        project={PROJECT}
        isOpen
        onClose={noop}
        onOpenSheet={noop}
      />,
    );

    await askFor("顔被りを全部直して");
    await waitFor(() => {
      expect(screen.getByTestId("assist-plan")).toBeInTheDocument();
    });
    await act(async () => {
      screen.getByText("やめる").click();
    });

    expect(screen.queryByTestId("assist-plan")).not.toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
    expect(blockedX()).toBe(5);
  });

  /** ★3: 1タップで戻せるものは、頼まれたらそのまま済ませる */
  it("表示の切り替えは、確認せずに済ませて結果を言う", async () => {
    replyWith({
      action: { kind: "setToggle", target: "marks", on: true },
      reply: "",
    });
    render(
      <AssistSheet
        project={PROJECT}
        isOpen
        onClose={noop}
        onOpenSheet={noop}
      />,
    );

    await askFor("バミリを出して");

    await waitFor(() => {
      expect(useUIStore.getState().isStageMarksVisible).toBe(true);
    });
    expect(screen.queryByTestId("assist-plan")).not.toBeInTheDocument();
    expect(screen.getByTestId("assist-message")).toHaveTextContent(
      "バミリを出しました",
    );
  });

  it("もう出ているものは、そう言うだけ", async () => {
    useUIStore.setState({ isStageMarksVisible: true });
    replyWith({
      action: { kind: "setToggle", target: "marks", on: true },
      reply: "",
    });
    render(
      <AssistSheet
        project={PROJECT}
        isOpen
        onClose={noop}
        onOpenSheet={noop}
      />,
    );

    await askFor("バミリを出して");

    await waitFor(() => {
      expect(screen.getByTestId("assist-message")).toHaveTextContent(
        "バミリはもう出ています",
      );
    });
    // 切ってしまわない
    expect(useUIStore.getState().isStageMarksVisible).toBe(true);
  });

  /** ★4: できないことを「やりました」と言わない */
  it("できないことは、断りの言葉だけ出す", async () => {
    replyWith({
      action: { kind: "none" },
      reply: "ダンサーの色はここからは変えられません",
    });
    render(
      <AssistSheet
        project={PROJECT}
        isOpen
        onClose={noop}
        onOpenSheet={noop}
      />,
    );

    await askFor("2番を赤にして");

    await waitFor(() => {
      expect(screen.getByTestId("assist-message")).toHaveTextContent(
        "ダンサーの色はここからは変えられません",
      );
    });
    expect(screen.queryByTestId("assist-plan")).not.toBeInTheDocument();
  });

  /** 操作は選べたが、いまの隊形では何も起きない */
  it("顔被りが0人なら、することが無いと言う", async () => {
    setUp({
      positions: {
        blocked: position("blocked", 1, 1),
        front: position("front", 8, 5),
      },
    });
    replyWith({ action: { kind: "clearBlindSpots" }, reply: "" });
    render(
      <AssistSheet
        project={PROJECT}
        isOpen
        onClose={noop}
        onOpenSheet={noop}
      />,
    );

    await askFor("顔被りを全部直して");

    await waitFor(() => {
      expect(screen.getByTestId("assist-message")).toHaveTextContent(
        "いまは、することがありません",
      );
    });
    expect(screen.queryByTestId("assist-plan")).not.toBeInTheDocument();
  });

  it("移動に時間を足すときも、秒数はアプリが決める", async () => {
    vi.spyOn(scenesApi, "updateSceneTimes").mockResolvedValue(undefined);
    // 0,1 → 8,1（7.2m）を 0.6秒。歩ける速さなら4秒
    setUp({
      positions: { blocked: position("blocked", 0, 1) },
      nextPositions: { blocked: position("blocked", 8, 1) },
    });
    replyWith({ action: { kind: "extendFastMoves" }, reply: "" });
    render(
      <AssistSheet
        project={PROJECT}
        isOpen
        onClose={noop}
        onOpenSheet={noop}
      />,
    );

    await askFor("移動が間に合わないので時間を足して");

    await waitFor(() => {
      expect(screen.getByTestId("assist-plan")).toBeInTheDocument();
    });
    // 4秒 は comfortableSeconds が出した数。返事には入っていない
    expect(
      screen.getByText("「シーン2」を 0.6秒 → 4秒 へ"),
    ).toBeInTheDocument();

    await act(async () => {
      screen.getByText("これで進める").click();
    });
    await waitFor(() => {
      expect(useProjectStore.getState().scenes[1].timeSeconds).toBe(4);
    });
  });

  /** 「開いて」と頼まれたら、その板を開いてこちらは閉じる */
  it("開く頼み事は、その板を開く", async () => {
    const onOpenSheet = vi.fn();
    const onClose = vi.fn();
    replyWith({ action: { kind: "open", target: "share" }, reply: "" });
    render(
      <AssistSheet
        project={PROJECT}
        isOpen
        onClose={onClose}
        onOpenSheet={onOpenSheet}
      />,
    );

    await askFor("共有を開いて");

    await waitFor(() => {
      expect(onOpenSheet).toHaveBeenCalledWith("share");
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("シーンを開く頼み事は、そのシーンを選ぶ", async () => {
    replyWith({ action: { kind: "selectScene", sceneNumber: 2 }, reply: "" });
    render(
      <AssistSheet
        project={PROJECT}
        isOpen
        onClose={noop}
        onOpenSheet={noop}
      />,
    );

    await askFor("2番目のシーンを開いて");

    await waitFor(() => {
      expect(useUIStore.getState().selectedSceneId).toBe("s2");
    });
    expect(screen.getByTestId("assist-message")).toHaveTextContent(
      "2番「シーン2」を開きました",
    );
  });
});
