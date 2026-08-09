"use client";

import { useEffect, useState } from "react";
import { LayoutGrid, X } from "lucide-react";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useHistoryStore } from "@/features/canvas/store/useHistoryStore";

/** これだけ触られなければ「手が止まっている」とみなす */
const IDLE_MS = 30_000;

/**
 * 「形から選べます」と教える吹き出し。困っていそうなときにだけ出す。
 *
 * 出す条件は2つ(どちらかを満たせば):
 *   ① シーンを足した直後で、前のシーンからコピーされた配置のまま
 *      = 新しいシーンを作ったが、まだ何も動かしていない
 *   ② ステージを一定時間さわっていない
 *
 * ①の判定に「シーンを追加した」というフラグは持たない。前のシーンと
 * 配置が完全に同じかどうかを見れば、追加直後でも、あとから全部戻した
 * 場合でも同じように「まだ手を付けていない」と分かるため。
 *
 * ×で閉じたらそのシーンでは二度と出さない。教える機能が繰り返し
 * 出続けるのは、教わる側にとっては邪魔でしかない。
 *
 * 置き場所はドックの直上(インスペクターと同じ高さ)。ステージの上に
 * 重ねると、隠れたダンサーを見るために閉じる必要が出てしまう。
 */
export function TemplateHint() {
  const selectedSceneId = useUIStore((state) => state.selectedSceneId);
  const setTemplateSheetOpen = useUIStore(
    (state) => state.setTemplateSheetOpen,
  );
  const dismissedSceneIds = useUIStore(
    (state) => state.templateHintDismissedSceneIds,
  );
  const dismissTemplateHint = useUIStore((state) => state.dismissTemplateHint);
  const selectedDancerId = useUIStore((state) => state.selectedDancerId);
  const scenes = useProjectStore((state) => state.scenes);
  const positionsBySceneId = useProjectStore(
    (state) => state.positionsBySceneId,
  );
  // 編集のたびに履歴が伸びるので、「最後に何かした時刻」の代わりに使える
  const editCount = useHistoryStore((state) => state.past.length);

  // 「最後に何かした瞬間」を表す目印。シーンを変えた・何か編集した・
  // 誰かを選んだ時点で変わる
  const activityKey = `${selectedSceneId}:${editCount}:${selectedDancerId}`;
  const [idleKey, setIdleKey] = useState<string | null>(null);
  const [seenKey, setSeenKey] = useState(activityKey);

  // 何かされたら数え直す。effectの中で同期的にsetStateすると連鎖レンダーに
  // なるため、レンダー中に調整する(Reactが案内しているやり方)
  if (seenKey !== activityKey) {
    setSeenKey(activityKey);
    setIdleKey(null);
  }

  useEffect(() => {
    const timer = setTimeout(() => setIdleKey(activityKey), IDLE_MS);
    return () => clearTimeout(timer);
  }, [activityKey]);

  // タイマーが鳴った時点の目印と今の目印が同じなら、その間ずっと無操作
  const isIdle = idleKey === activityKey;

  if (!selectedSceneId || dismissedSceneIds.includes(selectedSceneId)) {
    return null;
  }
  // インスペクターと同じ場所に出るため、誰か選んでいる間は譲る
  if (selectedDancerId) return null;

  const positions = positionsBySceneId[selectedSceneId] ?? {};
  const dancerCount = Object.keys(positions).length;
  // 2人未満はそもそも選べる形が無い
  if (dancerCount < 2) return null;

  const index = scenes.findIndex((scene) => scene.id === selectedSceneId);
  const previous = index > 0 ? scenes[index - 1] : null;
  const previousPositions = previous
    ? (positionsBySceneId[previous.id] ?? {})
    : null;
  // 前のシーンと配置が完全に同じ = 追加してから何も動かしていない
  const isUntouchedCopy =
    previousPositions !== null &&
    Object.keys(previousPositions).length === dancerCount &&
    Object.values(positions).every((position) => {
      const before = previousPositions[position.dancerId];
      return (
        before !== undefined &&
        before.xCoordinate === position.xCoordinate &&
        before.yCoordinate === position.yCoordinate
      );
    });

  if (!isUntouchedCopy && !isIdle) return null;

  return (
    <div className="absolute inset-x-0 bottom-full z-20 mx-3 mb-2 flex items-start gap-2.5 rounded-xl border border-line-strong bg-surface-strong px-3 py-2.5 shadow-xl">
      <span
        aria-hidden
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-accent/16 text-accent-soft"
      >
        <LayoutGrid size={14} />
      </span>
      <p className="min-w-0 flex-1 text-[11.5px] leading-relaxed text-fg">
        {isUntouchedCopy
          ? "前のシーンと同じ配置のままです。既成のフォーメーションから選ぶと、1回で組み替えられます。"
          : "既成のフォーメーションから選ぶと、この人数に合う形を1回で当てられます。"}
      </p>
      <button
        type="button"
        onClick={() => setTemplateSheetOpen(true)}
        className="h-[30px] shrink-0 rounded-lg bg-accent px-2.5 text-[11px] font-semibold whitespace-nowrap text-accent-fg"
      >
        形から選ぶ
      </button>
      <button
        type="button"
        onClick={() => dismissTemplateHint(selectedSceneId)}
        aria-label="ヒントを閉じる"
        className="flex h-[30px] w-6 shrink-0 items-center justify-center rounded-lg text-fg-muted"
      >
        <X size={14} />
      </button>
    </div>
  );
}
