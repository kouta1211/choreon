import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { usePositionCommit } from "./usePositionCommit";
import { LocaleProvider } from "@/features/i18n/LocaleProvider";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useHistoryStore } from "@/features/canvas/store/useHistoryStore";
import * as positionsApi from "@/features/scene/api/positions";
import {
  makeDancer,
  makePosition,
  makeProject,
  makeScene,
} from "@/test/factories";

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));

/**
 * ステージ上の編集を確定する唯一の道。
 *
 * ■ なぜ直接のテストが要るのか
 * これまでは CanvasBoard.test.tsx 経由の**間接的な網**でしか守られて
 * いなかった。ここが持っている約束（失敗したら戻す・失敗は積まない）は、
 * **壊れても画面は動いて見える**。保存されないまま画面だけ進む、という
 * 目に見えない壊れ方をするので、下に本物の網を張っておく。
 */

const SCENE_ID = "scene-1";
const DANCER_ID = "dancer-1";

/** 2,2 に居た人を 5,5 へ動かす */
const BEFORE = makePosition({ xCoordinate: 2, yCoordinate: 2 });
const AFTER = makePosition({ xCoordinate: 5, yCoordinate: 5 });
const CHANGE = {
  sceneId: SCENE_ID,
  dancerId: DANCER_ID,
  before: BEFORE,
  after: AFTER,
};

/** いま画面に出ている立ち位置（＝ストアの中身） */
const shown = () =>
  useProjectStore.getState().positionsBySceneId[SCENE_ID][DANCER_ID];

const history = () => useHistoryStore.getState().past;
const toast = () => useUIStore.getState().toast;

function setup() {
  useProjectStore.setState({
    project: makeProject(),
    dancers: { [DANCER_ID]: makeDancer() },
    scenes: [makeScene({ id: SCENE_ID })],
    positionsBySceneId: { [SCENE_ID]: { [DANCER_ID]: BEFORE } },
    // ゲスト中は persist が何も保存せずに返るので、保存の失敗を試せない
    isGuest: false,
  });
  useUIStore.setState({ toast: null });
  useHistoryStore.setState({ past: [], future: [] });

  return renderHook(() => usePositionCommit(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <LocaleProvider locale="ja">{children}</LocaleProvider>
    ),
  });
}

beforeEach(() => {
  vi.spyOn(positionsApi, "upsertPositions").mockResolvedValue(undefined);
});
afterEach(() => vi.restoreAllMocks());

describe("usePositionCommit の確定の順番", () => {
  it("保存できたら、動いた場所のまま履歴に積む", async () => {
    const { result } = setup();

    await act(async () => {
      await result.current({
        changes: [CHANGE],
        kind: "move",
        errorMessage: "位置の保存に失敗しました",
      });
    });

    expect(shown().xCoordinate).toBe(5);
    expect(positionsApi.upsertPositions).toHaveBeenCalledTimes(1);
    expect(history()).toHaveLength(1);
    expect(history()[0].kind).toBe("move");
  });

  /* 【楽観的更新】保存の返事を待ってから動かすと、遅い回線で
     掴んだ人がその場に貼り付いて見える */
  it("保存の返事を待たずに画面を動かし、積むのは返事のあと", async () => {
    let finishSave: () => void = () => {};
    vi.spyOn(positionsApi, "upsertPositions").mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishSave = () => resolve();
        }),
    );
    const { result } = setup();

    let committing!: Promise<void>;
    await act(async () => {
      committing = result.current({
        changes: [CHANGE],
        kind: "move",
        errorMessage: "位置の保存に失敗しました",
      });
    });

    // まだ保存は返っていない
    expect(shown().xCoordinate).toBe(5);
    expect(history()).toHaveLength(0);

    await act(async () => {
      finishSave();
      await committing;
    });

    expect(history()).toHaveLength(1);
  });

  /* ここが崩れると「元に戻す」の辻褄が合わなくなる。
     見た目は戻っているのに、履歴には積まれた1手が残るため */
  it("保存に失敗したら掴む前の場所へ戻し、履歴に積まない", async () => {
    vi.spyOn(positionsApi, "upsertPositions").mockRejectedValue(
      new Error("保存できない"),
    );
    const { result } = setup();

    await act(async () => {
      await result.current({
        changes: [CHANGE],
        kind: "move",
        errorMessage: "位置の保存に失敗しました",
      });
    });

    expect(shown().xCoordinate).toBe(2);
    expect(history()).toHaveLength(0);
    expect(toast()?.type).toBe("error");
  });

  it("変わったものが無ければ、保存も履歴も触らない", async () => {
    const { result } = setup();

    await act(async () => {
      await result.current({
        changes: [],
        kind: "move",
        errorMessage: "位置の保存に失敗しました",
      });
    });

    expect(positionsApi.upsertPositions).not.toHaveBeenCalled();
    expect(history()).toHaveLength(0);
  });
});

/**
 * もう一度試す道は**掴んで置いた失敗にだけ**出す。
 * 矢印キーや回転は、もう一度押すだけで済むので出さない
 * （同じ場所へ置き直させるのが無駄なのは、掴む操作だけ）。
 */
describe("usePositionCommit の再試行", () => {
  it("掴んで置いた失敗には、もう一度試す道を出す", async () => {
    vi.spyOn(positionsApi, "upsertPositions").mockRejectedValue(
      new Error("保存できない"),
    );
    const { result } = setup();

    await act(async () => {
      await result.current({
        changes: [CHANGE],
        kind: "move",
        errorMessage: "位置の保存に失敗しました",
        canRetry: true,
      });
    });

    expect(toast()?.action?.label).toBe("再試行");
  });

  it("矢印キーや回転の失敗には出さない", async () => {
    vi.spyOn(positionsApi, "upsertPositions").mockRejectedValue(
      new Error("保存できない"),
    );
    const { result } = setup();

    await act(async () => {
      await result.current({
        changes: [CHANGE],
        kind: "rotate",
        errorMessage: "向きの保存に失敗しました",
      });
    });

    expect(toast()?.action).toBeUndefined();
  });

  /* 戻した見た目を動かし直してから保存する。動かし直さないと、
     掴む前の場所を「置いた場所」として保存してしまう */
  it("もう一度試して成功したら、動いた場所のまま履歴に積む", async () => {
    vi.spyOn(positionsApi, "upsertPositions")
      .mockRejectedValueOnce(new Error("保存できない"))
      .mockResolvedValue(undefined);
    const { result } = setup();

    await act(async () => {
      await result.current({
        changes: [CHANGE],
        kind: "move",
        errorMessage: "位置の保存に失敗しました",
        canRetry: true,
      });
    });
    // 一度は戻っている
    expect(shown().xCoordinate).toBe(2);

    await act(async () => {
      toast()?.action?.onAction();
    });

    await waitFor(() => expect(shown().xCoordinate).toBe(5));
    expect(history()).toHaveLength(1);
  });
});
