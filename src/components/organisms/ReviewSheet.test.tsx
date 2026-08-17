import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { ReviewSheet } from "./ReviewSheet";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useHistoryStore } from "@/features/canvas/store/useHistoryStore";
import { findBlockedDancerIds } from "@/features/canvas/lib/blindSpot";
import * as positionsApi from "@/features/scene/api/positions";
import * as scenesApi from "@/features/scene/api/scenes";
import { makeDancer, makeProject, makeScene } from "@/test/factories";
import type { Position } from "@/features/scene/types";
import type { ReviewResult } from "@/features/review/lib/reviewFindings";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({}),
}));

/**
 * 見てもらった結果に、直しのボタンが付くところ。
 *
 * ここで守りたいのは3つ。**AI が言った通りに動くのではない**、が全部の
 * 下敷きになっている。
 *   1. 直しは押したときだけ当たる（読んで見送れる）
 *   2. 当たる先は**アプリが計算した位置・秒数**
 *   3. **いまの隊形で成り立たない直しは、ボタンを出さない**
 *      （返事を待つ間に user が自分で直していることがある）
 *
 * 3 は返事の中身では判断できない。押せてしまうと「押しても何も起きない」
 * になるので、画面側で毎回いまの状態に当ててから出す。
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
const HIDDEN = { blocked: position("blocked", 5, 1), front: position("front", 5, 5) };

function setUp(
  options: {
    positions?: Record<string, Position>;
    nextPositions?: Record<string, Position>;
    dancers?: Record<string, ReturnType<typeof makeDancer>>;
  } = {},
) {
  useProjectStore.setState({
    isGuest: false,
    project: PROJECT,
    scenes: [
      makeScene({ id: "s1", name: "シーン1", timeSeconds: 0 }),
      makeScene({ id: "s2", name: "シーン2", timeSeconds: 0.6 }),
    ],
    dancers: options.dancers ?? {
      blocked: makeDancer({ id: "blocked", name: "8" }),
      front: makeDancer({ id: "front", name: "2" }),
    },
    positionsBySceneId: {
      s1: options.positions ?? HIDDEN,
      s2: options.nextPositions ?? options.positions ?? HIDDEN,
    },
  });
  useUIStore.setState({ selectedSceneId: "s1" });
  useHistoryStore.setState({ past: [], future: [] });
}

/** /api/review の返事を差し替える。ここでは上流には一切触らない */
function replyWith(review: ReviewResult) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ text: "…", review }),
    }),
  );
}

const BLIND_SPOT_REVIEW: ReviewResult = {
  summary: "奥の列が重なっています",
  findings: [
    { tone: "good", text: "左右の間隔が揃っています", fix: null },
    {
      tone: "watch",
      text: "8番が2番の真後ろに入っていて、客席から顔が見えません",
      fix: { kind: "clearBlindSpot", dancerName: "8" },
    },
  ],
};

async function ask() {
  await act(async () => {
    screen.getByText("見てもらう").click();
  });
}

const blockedX = () =>
  useProjectStore.getState().positionsBySceneId.s1.blocked.xCoordinate;

beforeEach(() => {
  setUp();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ReviewSheet の指摘", () => {
  it("指摘が1件ずつ並ぶ", async () => {
    replyWith(BLIND_SPOT_REVIEW);
    render(<ReviewSheet project={PROJECT} isOpen onClose={() => {}} />);

    await ask();

    await waitFor(() => {
      expect(screen.getAllByTestId("review-finding")).toHaveLength(2);
    });
    expect(screen.getByText("奥の列が重なっています")).toBeInTheDocument();
    // 良いところと気になるところが見分けられる
    const tones = screen
      .getAllByTestId("review-finding")
      .map((node) => node.dataset.tone);
    expect(tones).toEqual(["good", "watch"]);
  });

  /** 読んで見送れることが要点。開いただけでは何も動かさない */
  it("指摘が出ただけでは、隊形は動かない", async () => {
    const spy = vi.spyOn(positionsApi, "upsertPositions");
    replyWith(BLIND_SPOT_REVIEW);
    render(<ReviewSheet project={PROJECT} isOpen onClose={() => {}} />);

    await ask();

    await waitFor(() => {
      expect(screen.getByText("横へずらして顔を出す")).toBeInTheDocument();
    });
    expect(spy).not.toHaveBeenCalled();
    expect(blockedX()).toBe(5);
  });

  it("押すと、もう隠れていない位置へ動く", async () => {
    vi.spyOn(positionsApi, "upsertPositions").mockResolvedValue(undefined);
    replyWith(BLIND_SPOT_REVIEW);
    render(<ReviewSheet project={PROJECT} isOpen onClose={() => {}} />);

    await ask();
    await waitFor(() => {
      expect(screen.getByText("横へずらして顔を出す")).toBeInTheDocument();
    });
    await act(async () => {
      screen.getByText("横へずらして顔を出す").click();
    });

    await waitFor(() => {
      expect(blockedX()).not.toBe(5);
    });
    // 当たった先が本当に顔を出しているか（AI ではなくアプリの計算の答え合わせ）
    const stillBlocked = findBlockedDancerIds({
      blocked: { xCoordinate: blockedX(), yCoordinate: 1 },
      front: HIDDEN.front,
    });
    expect(stillBlocked.has("blocked")).toBe(false);
    expect(screen.getByText("当てました")).toBeInTheDocument();
  });

  /**
   * ★ここが新しい保証。
   * 返事の中身は正しいが、いまの隊形ではもう起きていない、という状況。
   * 押せてしまうと「押しても何も起きない」になる。
   */
  it("いま顔被りしていない人の指摘には、ボタンを出さない", async () => {
    setUp({
      positions: {
        blocked: position("blocked", 1, 1),
        front: position("front", 8, 5),
      },
    });
    replyWith(BLIND_SPOT_REVIEW);
    render(<ReviewSheet project={PROJECT} isOpen onClose={() => {}} />);

    await ask();

    await waitFor(() => {
      expect(screen.getAllByTestId("review-finding")).toHaveLength(2);
    });
    // 指摘の文は読める。消えるのはボタンだけ
    expect(screen.getByText(/8番が2番の真後ろ/)).toBeInTheDocument();
    expect(screen.queryByText("横へずらして顔を出す")).not.toBeInTheDocument();
  });

  /** どちらを動かすか決められないまま片方を動かす方が悪い */
  it("同じ名前が2人いるときは、ボタンを出さない", async () => {
    setUp({
      dancers: {
        blocked: makeDancer({ id: "blocked", name: "8" }),
        front: makeDancer({ id: "front", name: "8" }),
      },
    });
    replyWith(BLIND_SPOT_REVIEW);
    render(<ReviewSheet project={PROJECT} isOpen onClose={() => {}} />);

    await ask();

    await waitFor(() => {
      expect(screen.getAllByTestId("review-finding")).toHaveLength(2);
    });
    expect(screen.queryByText("横へずらして顔を出す")).not.toBeInTheDocument();
  });

  it("速すぎる移動の指摘では、延ばす秒数がアプリ側で決まる", async () => {
    vi.spyOn(scenesApi, "updateSceneTimes").mockResolvedValue(undefined);
    // 0,1 → 8,1（7.2m）を 0.6秒。歩ける速さなら4秒
    setUp({
      positions: { runner: position("runner", 0, 1) },
      nextPositions: { runner: position("runner", 8, 1) },
      dancers: { runner: makeDancer({ id: "runner", name: "3" }) },
    });
    replyWith({
      summary: "",
      findings: [
        {
          tone: "watch",
          text: "3番が0.6秒で7.2m動きます",
          fix: { kind: "retime", dancerName: "3" },
        },
      ],
    });
    render(<ReviewSheet project={PROJECT} isOpen onClose={() => {}} />);

    await ask();

    // 秒数は返事に入っていない。アプリが距離から出している
    await waitFor(() => {
      expect(screen.getByText("4秒に延ばす")).toBeInTheDocument();
    });
    await act(async () => {
      screen.getByText("4秒に延ばす").click();
    });
    await waitFor(() => {
      expect(useProjectStore.getState().scenes[1].timeSeconds).toBe(4);
    });
  });

  /** 古い形の返事（text だけ）でも読めるままにしてある */
  it("review が付いていない返事でも、文章は出す", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ text: "綺麗に並んでいます" }),
      }),
    );
    render(<ReviewSheet project={PROJECT} isOpen onClose={() => {}} />);

    await ask();

    await waitFor(() => {
      expect(screen.getByText("綺麗に並んでいます")).toBeInTheDocument();
    });
  });
});

/**
 * 作品ぜんぶを見てもらったとき。
 *
 * ここで守りたいのは1本だけ ——
 * **直しは、指摘が指しているシーンへ当たる。いま開いているシーンではない。**
 * 取り違えると、読んだ指摘とは別の場面が動く。「AIに任せたら作品が壊れた」
 * になるのはここ。
 */
function setUpPiece() {
  useProjectStore.setState({
    isGuest: false,
    project: PROJECT,
    scenes: [
      makeScene({ id: "s1", name: "出", timeSeconds: 0 }),
      makeScene({ id: "s2", name: "サビ", timeSeconds: 4 }),
      makeScene({ id: "s3", name: "終", timeSeconds: 8 }),
    ],
    dancers: {
      blocked: makeDancer({ id: "blocked", name: "8" }),
      front: makeDancer({ id: "front", name: "2" }),
    },
    positionsBySceneId: {
      // 顔被りは **2番目のシーン(サビ)** だけ
      s1: { blocked: position("blocked", 1, 1), front: position("front", 8, 5) },
      s2: { blocked: position("blocked", 5, 1), front: position("front", 5, 5) },
      s3: { blocked: position("blocked", 1, 1), front: position("front", 8, 5) },
    },
  });
  // 開いているのは1番目
  useUIStore.setState({ selectedSceneId: "s1" });
  useHistoryStore.setState({ past: [], future: [] });
}

const PIECE_REVIEW: ReviewResult = {
  summary: "散りの変化は付いていますが、サビで奥の人が隠れます",
  findings: [
    {
      tone: "watch",
      text: "サビで8番が2番の真後ろに入っています",
      fix: { kind: "clearBlindSpot", dancerName: "8" },
      sceneNumber: 2,
    },
    { tone: "good", text: "出とサビで散りが大きく変わっています", fix: null },
  ],
};

async function askWholePiece() {
  await act(async () => {
    screen.getByText("作品ぜんぶ").click();
  });
  await ask();
}

const xIn = (sceneId: string) =>
  useProjectStore.getState().positionsBySceneId[sceneId].blocked.xCoordinate;

describe("ReviewSheet の作品ぜんぶ", () => {
  beforeEach(() => {
    setUpPiece();
  });

  it("範囲を選べる", () => {
    replyWith(PIECE_REVIEW);
    render(<ReviewSheet project={PROJECT} isOpen onClose={() => {}} />);

    expect(screen.getByText("このシーン")).toBeInTheDocument();
    expect(screen.getByText("作品ぜんぶ")).toBeInTheDocument();
  });

  /** 1シーンしか無ければ「流れ」の話にならない */
  it("シーンが1つだけなら、範囲は出さない", () => {
    useProjectStore.setState({ scenes: [makeScene({ id: "s1" })] });
    replyWith(PIECE_REVIEW);
    render(<ReviewSheet project={PROJECT} isOpen onClose={() => {}} />);

    expect(screen.queryByText("作品ぜんぶ")).not.toBeInTheDocument();
  });

  it("作品ぜんぶを選ぶと、全シーンぶんを送る（1シーンぶんは送らない）", async () => {
    replyWith(PIECE_REVIEW);
    render(<ReviewSheet project={PROJECT} isOpen onClose={() => {}} />);

    await askWholePiece();

    const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(call[1].body as string) as {
      piece?: { scenes: unknown[] };
      summary?: unknown;
    };
    expect(body.summary).toBeUndefined();
    expect(body.piece?.scenes).toHaveLength(3);
  });

  it("指摘がどのシーンの話かを出す", async () => {
    replyWith(PIECE_REVIEW);
    render(<ReviewSheet project={PROJECT} isOpen onClose={() => {}} />);

    await askWholePiece();

    await waitFor(() => {
      expect(screen.getByText("2. サビ")).toBeInTheDocument();
    });
  });

  it("その札を押すと、そのシーンが開く", async () => {
    replyWith(PIECE_REVIEW);
    render(<ReviewSheet project={PROJECT} isOpen onClose={() => {}} />);

    await askWholePiece();
    await waitFor(() => {
      expect(screen.getByText("2. サビ")).toBeInTheDocument();
    });
    await act(async () => {
      screen.getByText("2. サビ").click();
    });

    expect(useUIStore.getState().selectedSceneId).toBe("s2");
  });

  /** ★ここが本題 */
  it("直しは、開いているシーンではなく指摘のシーンへ当たる", async () => {
    vi.spyOn(positionsApi, "upsertPositions").mockResolvedValue(undefined);
    replyWith(PIECE_REVIEW);
    render(<ReviewSheet project={PROJECT} isOpen onClose={() => {}} />);

    await askWholePiece();
    await waitFor(() => {
      expect(screen.getByText("横へずらして顔を出す")).toBeInTheDocument();
    });

    const before1 = xIn("s1");
    await act(async () => {
      screen.getByText("横へずらして顔を出す").click();
    });

    await waitFor(() => {
      expect(xIn("s2")).not.toBe(5);
    });
    // 開いていた1番目のシーンは動いていない
    expect(xIn("s1")).toBe(before1);
    expect(useProjectStore.getState().positionsBySceneId.s2.blocked.yCoordinate).toBe(1);
    // 当たった先が本当に顔を出しているか
    const stillBlocked = findBlockedDancerIds({
      blocked: { xCoordinate: xIn("s2"), yCoordinate: 1 },
      front: position("front", 5, 5),
    });
    expect(stillBlocked.has("blocked")).toBe(false);
  });

  it("範囲を切り替えると、前の返事は消える", async () => {
    replyWith(PIECE_REVIEW);
    render(<ReviewSheet project={PROJECT} isOpen onClose={() => {}} />);

    await askWholePiece();
    await waitFor(() => {
      expect(screen.getByText("2. サビ")).toBeInTheDocument();
    });

    await act(async () => {
      screen.getByText("このシーン").click();
    });

    // 作品ぜんぶの話が、1シーンの話として残ってはいけない
    expect(screen.queryByText("2. サビ")).not.toBeInTheDocument();
    expect(screen.queryByTestId("review-finding")).not.toBeInTheDocument();
  });
});
