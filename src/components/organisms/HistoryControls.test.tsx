import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HistoryControls } from "./HistoryControls";
import { useHistoryStore } from "@/features/canvas/store/useHistoryStore";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import * as positionsApi from "@/features/scene/api/positions";
import type { Position } from "@/features/scene/types";
import { makePosition as makeBasePosition } from "@/test/factories";
import { LocaleProvider } from "@/features/i18n/LocaleProvider";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({}),
}));

// 履歴のテストは(1,1)→(x,y)の移動で組み立てている
function makePosition(overrides: Partial<Position> = {}): Position {
  return makeBasePosition({ xCoordinate: 1, yCoordinate: 1, ...overrides });
}

/** 「dancer-1をx=1からx=5へ動かした」という履歴が1件ある状態を作る */
function seedMovedDancer() {
  const before = makePosition({ xCoordinate: 1 });
  const after = makePosition({ xCoordinate: 5 });

  useProjectStore.setState({
    dancers: {
      "dancer-1": {
        id: "dancer-1",
        projectId: "project-1",
        name: "あいり",
        color: "#3b82f6",
        initialDirection: 0,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    },
    scenes: [
      {
        id: "scene-1",
        projectId: "project-1",
        name: "シーン1",
        orderIndex: 0,
        timeSeconds: 1,
      },
    ],
    positionsBySceneId: { "scene-1": { "dancer-1": after } },
  });
  useUIStore.setState({ selectedSceneId: "scene-1" });
  useHistoryStore.getState().push({
    kind: "move",
    changes: [{ sceneId: "scene-1", dancerId: "dancer-1", before, after }],
  });

  return { before, after };
}

function currentX() {
  return useProjectStore.getState().positionsBySceneId["scene-1"]?.["dancer-1"]
    ?.xCoordinate;
}

afterEach(() => {
  vi.restoreAllMocks();
  useHistoryStore.getState().clear();
});

describe("HistoryControls", () => {
  it("履歴が無いときは両方のボタンが無効", () => {
    render(<HistoryControls />);

    expect(screen.getByLabelText("元に戻す")).toBeDisabled();
    expect(screen.getByLabelText("やり直す")).toBeDisabled();
  });

  it("元に戻すと、操作前の位置がstoreへ戻りSupabaseにも保存される", async () => {
    seedMovedDancer();
    const upsertSpy = vi
      .spyOn(positionsApi, "upsertPositions")
      .mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<HistoryControls />);

    await user.click(screen.getByLabelText("元に戻す"));

    expect(currentX()).toBe(1);
    await waitFor(() => {
      expect(upsertSpy).toHaveBeenCalledWith(expect.anything(), [
        expect.objectContaining({ xCoordinate: 1 }),
      ]);
    });
  });

  it("元に戻した後はやり直せる(操作後の位置に戻る)", async () => {
    seedMovedDancer();
    vi.spyOn(positionsApi, "upsertPositions").mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<HistoryControls />);

    await user.click(screen.getByLabelText("元に戻す"));
    await waitFor(() => expect(currentX()).toBe(1));

    await user.click(screen.getByLabelText("やり直す"));

    expect(currentX()).toBe(5);
  });

  it("保存に失敗したら見た目も履歴スタックも元の状態へ戻す", async () => {
    seedMovedDancer();
    vi.spyOn(positionsApi, "upsertPositions").mockRejectedValue(
      new Error("network"),
    );
    const user = userEvent.setup();
    render(<HistoryControls />);

    await user.click(screen.getByLabelText("元に戻す"));

    await waitFor(() => {
      expect(useUIStore.getState().toast?.type).toBe("error");
    });
    // 位置は操作後(x=5)のまま、履歴も消費されていない
    expect(currentX()).toBe(5);
    expect(useHistoryStore.getState().past).toHaveLength(1);
    expect(useHistoryStore.getState().future).toHaveLength(0);
  });

  it("対象のダンサーが削除済みなら、書き戻さずに知らせる", async () => {
    seedMovedDancer();
    useProjectStore.setState({ dancers: {} });
    const upsertSpy = vi.spyOn(positionsApi, "upsertPositions");
    const user = userEvent.setup();
    render(<HistoryControls />);

    await user.click(screen.getByLabelText("元に戻す"));

    await waitFor(() => {
      expect(useUIStore.getState().toast?.message).toContain("削除されている");
    });
    expect(upsertSpy).not.toHaveBeenCalled();
  });

  it("元に戻す対象が別のシーンにある場合、そのシーンへ切り替える", async () => {
    seedMovedDancer();
    useUIStore.setState({ selectedSceneId: "scene-other" });
    vi.spyOn(positionsApi, "upsertPositions").mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<HistoryControls />);

    await user.click(screen.getByLabelText("元に戻す"));

    expect(useUIStore.getState().selectedSceneId).toBe("scene-1");
  });

  it("再生中に元に戻すと再生が止まる", async () => {
    seedMovedDancer();
    useUIStore.setState({ isPlaying: true });
    vi.spyOn(positionsApi, "upsertPositions").mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<HistoryControls />);

    await user.click(screen.getByLabelText("元に戻す"));

    expect(useUIStore.getState().isPlaying).toBe(false);
  });

  it("Ctrl+Zで元に戻せる", async () => {
    seedMovedDancer();
    vi.spyOn(positionsApi, "upsertPositions").mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<HistoryControls />);

    await user.keyboard("{Control>}z{/Control}");

    await waitFor(() => expect(currentX()).toBe(1));
  });

  it("Ctrl+Shift+Zでやり直せる", async () => {
    seedMovedDancer();
    vi.spyOn(positionsApi, "upsertPositions").mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<HistoryControls />);

    await user.keyboard("{Control>}z{/Control}");
    await waitFor(() => expect(currentX()).toBe(1));

    await user.keyboard("{Control>}{Shift>}z{/Shift}{/Control}");

    await waitFor(() => expect(currentX()).toBe(5));
  });

  it("テキスト入力中のCtrl+Zは横取りしない(ブラウザ標準の取り消しに任せる)", async () => {
    seedMovedDancer();
    const upsertSpy = vi.spyOn(positionsApi, "upsertPositions");
    const user = userEvent.setup();
    render(
      <>
        <input aria-label="シーン名" />
        <HistoryControls />
      </>,
    );

    await user.click(screen.getByLabelText("シーン名"));
    await user.keyboard("{Control>}z{/Control}");

    expect(upsertSpy).not.toHaveBeenCalled();
    expect(currentX()).toBe(5);
  });
});

/* 実機の報告 17-43。**案内の文が Ctrl 固定**で、Mac の人には嘘だった。
   効くキーは両方受けていた（ctrlKey || metaKey）ので、直すのは文の方 */
describe("HistoryControls の案内", () => {
  afterEach(() => vi.restoreAllMocks());

  function hintOf(userAgent: string) {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(userAgent);
    const view = render(
      <LocaleProvider locale="ja">
        <HistoryControls />
      </LocaleProvider>,
    );
    // 文言はツールチップの側にある（ボタンの aria-label は短い名前）
    const text = view.container.textContent ?? "";
    view.unmount();
    return text;
  }

  it("Windows では Ctrl+Z と案内する", () => {
    expect(hintOf("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toContain(
      "Ctrl+Z",
    );
  });

  it("Mac では ⌘+Z と案内する", () => {
    expect(hintOf("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)")).toContain(
      "⌘+Z",
    );
  });
});
