import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { useDropCommit } from "./useDropCommit";
import { LocaleProvider } from "@/features/i18n/LocaleProvider";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useHistoryStore } from "@/features/canvas/store/useHistoryStore";
import { OVERLAP_DISTANCE_PX } from "@/features/canvas/constants";
import * as positionsApi from "@/features/scene/api/positions";
import {
  makeDancer,
  makePosition,
  makeProject,
  makeScene,
} from "@/test/factories";

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));

/**
 * 掴んで置いたときの確定。**重なりの手当てまで含めた道**。
 *
 * ここが持っている約束は「置く前に一度聞く」で、**聞いている間は
 * 保存も履歴も触らない**。崩れても画面は動いて見えるので、直接縛る。
 *
 * ■ しきい値の作り方
 * `threshold = OVERLAP_DISTANCE_PX / pxPerUnit` なので、
 * **pxPerUnit にそのまま OVERLAP_DISTANCE_PX を渡すと、しきい値は 1 ユニット**
 * になる。数字を写さずに「1ユニット未満なら重なり」と読める形にしてある
 * （定数を動かしてもこのテストは意味を保つ）。
 */

const SCENE_ID = "scene-1";
const MOVER = "dancer-1";
const OTHER = "dancer-2";
/** これを pxPerUnit に渡すと、しきい値がちょうど 1 ユニットになる */
const PX_PER_UNIT = OVERLAP_DISTANCE_PX;
const STAGE = { width: 15, height: 10 };

/** 動かない相手は (5,5) に立っている */
const OTHER_POSITION = makePosition({
  dancerId: OTHER,
  xCoordinate: 5,
  yCoordinate: 5,
});
const FROM = makePosition({ dancerId: MOVER, xCoordinate: 2, yCoordinate: 2 });

const change = (x: number, y: number) => ({
  sceneId: SCENE_ID,
  dancerId: MOVER,
  before: FROM,
  after: makePosition({ dancerId: MOVER, xCoordinate: x, yCoordinate: y }),
});

/** 相手のすぐ隣（0.5 ユニット＝しきい値未満） */
const ONTO_OTHER = change(5.5, 5);
/** 誰も居ない所 */
const ONTO_EMPTY = change(10, 8);

const shown = () =>
  useProjectStore.getState().positionsBySceneId[SCENE_ID][MOVER];
const confirm = () => useUIStore.getState().confirm;
const history = () => useHistoryStore.getState().past;

const distanceToOther = () =>
  Math.hypot(shown().xCoordinate - 5, shown().yCoordinate - 5);

function setup() {
  useProjectStore.setState({
    project: makeProject({
      stageWidth: STAGE.width,
      stageHeight: STAGE.height,
    }),
    dancers: {
      [MOVER]: makeDancer({ id: MOVER, name: "あいり" }),
      [OTHER]: makeDancer({ id: OTHER, name: "みなみ" }),
    },
    scenes: [makeScene({ id: SCENE_ID })],
    positionsBySceneId: {
      [SCENE_ID]: { [MOVER]: FROM, [OTHER]: OTHER_POSITION },
    },
    isGuest: false,
  });
  useUIStore.setState({ confirm: null, toast: null });
  useHistoryStore.setState({ past: [], future: [] });

  return renderHook(() => useDropCommit(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <LocaleProvider locale="ja">{children}</LocaleProvider>
    ),
  });
}

beforeEach(() => {
  vi.spyOn(positionsApi, "upsertPositions").mockResolvedValue(undefined);
});
afterEach(() => vi.restoreAllMocks());

describe("useDropCommit の、重なったときの聞き方", () => {
  it("重ならない所へ置いたときは、何も聞かずに保存する", async () => {
    const { result } = setup();

    await act(async () => {
      await result.current({
        changes: [ONTO_EMPTY],
        sceneId: SCENE_ID,
        stage: STAGE,
        pxPerUnit: PX_PER_UNIT,
      });
    });

    expect(confirm()).toBeNull();
    expect(positionsApi.upsertPositions).toHaveBeenCalledTimes(1);
    expect(history()).toHaveLength(1);
  });

  /* 跳ね返してから聞くと、何を聞かれているのか分からなくなる。
     置いた場所に留めたまま聞き、保存も履歴も答えてから触る */
  it("掴み分けられないほど重なるなら、聞くまで保存も履歴も触らない", async () => {
    const { result } = setup();

    await act(async () => {
      await result.current({
        changes: [ONTO_OTHER],
        sceneId: SCENE_ID,
        stage: STAGE,
        pxPerUnit: PX_PER_UNIT,
      });
    });

    expect(confirm()?.title).toContain("みなみ");
    // 見た目は置いた場所のまま
    expect(shown().xCoordinate).toBe(5.5);
    expect(positionsApi.upsertPositions).not.toHaveBeenCalled();
    expect(history()).toHaveLength(0);
  });

  it("ずらして置くと答えたら、掴み分けられる所まで離して保存する", async () => {
    const { result } = setup();

    await act(async () => {
      await result.current({
        changes: [ONTO_OTHER],
        sceneId: SCENE_ID,
        stage: STAGE,
        pxPerUnit: PX_PER_UNIT,
      });
    });
    await act(async () => {
      await confirm()?.onConfirm();
    });

    // しきい値は 1 ユニット。そこまで離れていれば掴み分けられる
    expect(distanceToOther()).toBeGreaterThanOrEqual(1);
    expect(positionsApi.upsertPositions).toHaveBeenCalledTimes(1);
    expect(history()).toHaveLength(1);
  });

  it("やめたら、掴む前の場所へ戻す", async () => {
    const { result } = setup();

    await act(async () => {
      await result.current({
        changes: [ONTO_OTHER],
        sceneId: SCENE_ID,
        stage: STAGE,
        pxPerUnit: PX_PER_UNIT,
      });
    });
    await act(async () => {
      confirm()?.onCancel?.();
    });

    expect(shown().xCoordinate).toBe(2);
    expect(shown().yCoordinate).toBe(2);
    expect(positionsApi.upsertPositions).not.toHaveBeenCalled();
    expect(history()).toHaveLength(0);
  });

  /* 0 で割るとしきい値が無限になり、**全員が重なっている**ことになる。
     置くたびに板が出て、一歩も動かせなくなる */
  it("ステージを測れていないときは、重なりを見ずに保存する", async () => {
    const { result } = setup();

    await act(async () => {
      await result.current({
        changes: [ONTO_OTHER],
        sceneId: SCENE_ID,
        stage: STAGE,
        pxPerUnit: 0,
      });
    });

    expect(confirm()).toBeNull();
    expect(positionsApi.upsertPositions).toHaveBeenCalledTimes(1);
  });

  it("変わったものが無ければ、聞きも保存もしない", async () => {
    const { result } = setup();

    await act(async () => {
      await result.current({
        changes: [],
        sceneId: SCENE_ID,
        stage: STAGE,
        pxPerUnit: PX_PER_UNIT,
      });
    });

    expect(confirm()).toBeNull();
    expect(positionsApi.upsertPositions).not.toHaveBeenCalled();
  });
});
