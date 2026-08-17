import { create } from "zustand";
import type { Position } from "@/features/scene/types";

/** 1件のpositionに対する「操作前」と「操作後」のスナップショット。
 * Position丸ごとを持つのは、元に戻すときにupsertPositionへそのまま渡せて、
 * 差分の当て方を考えなくて済むため(位置・向き・曲線制御点のどれが変わった
 * 操作なのかを履歴側が知らなくてよくなる) */
export type PositionChange = {
  sceneId: string;
  dancerId: string;
  before: Position;
  after: Position;
};

/**
 * シーンの時刻に対する「操作前」と「操作後」。
 *
 * 位置とは別の軸なので、PositionChange には混ぜない。時刻を動かすと
 * **以降のシーンも一緒にずれることがある**(ripple)ので、こちらも配列。
 */
export type SceneTimeChange = {
  sceneId: string;
  before: number;
  after: number;
};

/** 履歴1ステップ。シンメトリーモードのペア移動のように、1回の操作で複数の
 * positionが同時に変わることがあるためchangesは配列 */
export type HistoryEntry = {
  /** 連続する同種の操作をまとめる(coalesce)ための種別。
   * 特に矢印キーの微調整は1キーごとに履歴へ積むと、元に戻すのに
   * 何十回も押す羽目になるため、まとめる判断に使う */
  kind: "move" | "nudge" | "rotate" | "curve" | "template" | "retime";
  changes: PositionChange[];
  /**
   * シーンの時刻を動かした操作なら入る。
   *
   * ■ なぜ足したか(2026-08-17)
   * 「移動が速すぎます」の直しを**ボタンで当てられる**ようにしたので、
   * 当てたものを1回で戻せないと「取り入れるかどうかを最後に決められる」
   * という約束が守れない。時刻の変更はそれまで履歴を通っていなかった。
   */
  sceneTimes?: SceneTimeChange[];
};

/** 保持する履歴の上限。編集し続けると際限なく増えるため頭を抑える。
 * 古いものから捨てる */
const MAX_HISTORY_LENGTH = 50;

type HistoryState = {
  /** 元に戻せる操作。末尾が直近 */
  past: HistoryEntry[];
  /** やり直せる操作。末尾が直近に取り消したもの */
  future: HistoryEntry[];

  /** 操作が成功して確定したときに積む。新しい操作をした時点で
   * やり直し(future)は捨てる(一般的なUndo/Redoの挙動) */
  push: (entry: HistoryEntry) => void;
  /** pastの末尾を取り出してfutureへ移す。中身の適用は呼び出し側の責務 */
  undo: () => HistoryEntry | null;
  /** futureの末尾を取り出してpastへ移す。中身の適用は呼び出し側の責務 */
  redo: () => HistoryEntry | null;
  /** undo後の保存に失敗したときに、動かしたスタックを元へ戻す */
  cancelUndo: () => void;
  /** redo後の保存に失敗したときに、動かしたスタックを元へ戻す */
  cancelRedo: () => void;
  /** 別プロジェクトを開いたときなど、履歴が意味を持たなくなったら捨てる */
  clear: () => void;
};

/** 2つのエントリーが「同じ対象への同じ種類の操作」かどうか。
 * まとめてよいかの判定に使う */
function hasSameTargets(a: HistoryEntry, b: HistoryEntry): boolean {
  if (a.changes.length !== b.changes.length) return false;
  return a.changes.every((change, index) => {
    const other = b.changes[index];
    return (
      change.sceneId === other.sceneId && change.dancerId === other.dancerId
    );
  });
}

/**
 * ステージ上の編集操作(移動・微調整・回転・曲線)の取り消し履歴。
 *
 * ここはスタックの出し入れだけを持ち、「実際にstoreへ反映してSupabaseへ
 * 保存する」処理は持たない(HistoryControlsが担当する)。分けているのは、
 * このstoreがReactにもSupabaseにも依存しない純粋なデータ構造のままになり、
 * テストがそのまま書けるため。
 *
 * 対象はpositions(位置・向き・曲線制御点)と**シーンの時刻**。
 * ダンサーやシーンの削除まで元に戻せるようにすると、複数シーンぶんの行を
 * 作り直す処理になり、「消えたものが戻ってくる」までの整合性の担保が
 * 一気に難しくなるため扱わない(削除は確認ダイアログを挟む方針でカバーする)。
 *
 * 時刻を後から足したのは、指摘の直しを**ボタンで当てられる**ようにした
 * ため。当てたものを1回で戻せないと、「取り入れるかどうかを最後に決める」
 * という形が成り立たない。
 */
export const useHistoryStore = create<HistoryState>((set, get) => ({
  past: [],
  future: [],

  push: (entry) =>
    set((state) => {
      const last = state.past[state.past.length - 1];
      // 矢印キーの微調整だけは、同じダンサーへの連続操作を1ステップに畳む。
      // 「押した回数ぶん元に戻す」のではなく「微調整を始める前に戻る」方が
      // 期待に近いため。beforeは最初の値を保ち、afterだけ最新に差し替える
      const canCoalesce =
        entry.kind === "nudge" &&
        last?.kind === "nudge" &&
        hasSameTargets(last, entry);

      if (canCoalesce) {
        const merged: HistoryEntry = {
          kind: entry.kind,
          changes: last.changes.map((change, index) => ({
            ...change,
            after: entry.changes[index].after,
          })),
        };
        return {
          past: [...state.past.slice(0, -1), merged],
          future: [],
        };
      }

      const past = [...state.past, entry];
      return {
        past: past.length > MAX_HISTORY_LENGTH ? past.slice(1) : past,
        future: [],
      };
    }),

  undo: () => {
    const { past, future } = get();
    const entry = past[past.length - 1];
    if (!entry) return null;
    set({ past: past.slice(0, -1), future: [...future, entry] });
    return entry;
  },

  redo: () => {
    const { past, future } = get();
    const entry = future[future.length - 1];
    if (!entry) return null;
    set({ past: [...past, entry], future: future.slice(0, -1) });
    return entry;
  },

  cancelUndo: () =>
    set((state) => {
      const entry = state.future[state.future.length - 1];
      if (!entry) return {};
      return {
        past: [...state.past, entry],
        future: state.future.slice(0, -1),
      };
    }),

  cancelRedo: () =>
    set((state) => {
      const entry = state.past[state.past.length - 1];
      if (!entry) return {};
      return {
        past: state.past.slice(0, -1),
        future: [...state.future, entry],
      };
    }),

  clear: () => set({ past: [], future: [] }),
}));
