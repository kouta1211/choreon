"use client";

import { useEffect } from "react";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useHistoryStore } from "@/features/canvas/store/useHistoryStore";
import { discardPendingWrites } from "@/features/project/lib/persistence";
import type { Project } from "@/features/project/types";
import type { Dancer } from "@/features/dancer/types";
import type { Position, Scene } from "@/features/scene/types";

type Args = {
  project: Project;
  dancers: Dancer[];
  scenes: Scene[];
  positions: Position[];
  /** ゲスト(未ログイン)の下書きとして開くかどうか */
  isGuest: boolean;
};

/**
 * サーバーから取得済みのデータ(props)を Zustand store へ同期する。
 *
 * 「Reactの外にある別のシステム(ここではグローバルなstore)にデータを渡す」
 * ケースなので、これは useEffect の正当な用途にあたる
 * (単なる props→state 変換なら useEffect 無しで済むケースが多いが、今回は違う)。
 *
 * 別プロジェクトの編集履歴を持ち越すと、存在しないシーン・ダンサーへ
 * 書き戻そうとすることになるため捨てる。自動保存を切っている間に貯めた
 * 書き込みも同じ理由で捨てる。
 */
export function useHydrateProject({
  project,
  dancers,
  scenes,
  positions,
  isGuest,
}: Args) {
  const hydrate = useProjectStore((state) => state.hydrate);
  const selectScene = useUIStore((state) => state.selectScene);

  useEffect(() => {
    hydrate({ project, dancers, scenes, positions, isGuest });
    if (scenes.length > 0) {
      selectScene(scenes[0].id);
    }
    useHistoryStore.getState().clear();
    discardPendingWrites();
    // 別プロジェクトに切り替わったときだけ入れ直せば十分なため、project.idのみを依存にする
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);
}
