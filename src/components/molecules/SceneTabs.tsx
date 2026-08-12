"use client";

import { useEffect, useRef } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ArrowRight } from "lucide-react";
import { SceneThumbnail } from "@/components/molecules/SceneThumbnail";
import { reorderSceneIds } from "@/features/scene/lib/sceneReorder";
import type { Scene } from "@/features/scene/types";
import { sceneDurations } from "@/features/scene/lib/sceneTiming";

type Props = {
  scenes: Scene[];
  selectedSceneId: string | null;
  onSelectScene: (sceneId: string) => void;
  onReorderScenes: (orderedSceneIds: string[]) => void;
  onDeleteScene: (scene: Scene) => void;
  /** シーンごとのミニチュア(dataURL)。useSceneThumbnailsが作る */
  thumbnailBySceneId: Record<string, string>;
  stageWidthUnits: number;
  stageHeightUnits: number;
};

/** コマの幅(px)。拡大しないと読めないほどの情報はシーン一覧側へ移して
 * あるため、ここのコマは「今どこにいるか」を示す指標に徹してよい */
const THUMBNAIL_SIZE_PX = 74;

/**
 * シーンをミニチュアのステージとして横に並べたストリップ。曲の流れを
 * 左から右へ一望するためのもの。
 *
 * 操作は3つ:
 *   1. クリック … そのシーンを選択する
 *   2. コマをドラッグ … 並び替え(dnd-kitのSortableContext)
 *   3. 右上の× … 削除(確認ダイアログを開く)
 *
 * シーンの追加はここに持たせていない。ドックの行に「+」があり、同じ
 * aria-labelのボタンが1画面に2つ並ぶと読み上げでどちらか分からなくなる
 * ため(見た目はCSSで片方が隠れていても、支援技術からは両方見えている)。
 *
 * 以前はここに「横スクロールが止まった位置のコマを自動で選択する」処理が
 * あったが、外している。狭い画面では一覧を眺めようと指で払っただけで
 * 選択が変わって再生も止まり、誤操作の主因になっていた。
 * スクロールは移動手段であって選択の意思表示ではない、という整理。
 * これを外したのでスマートフォンでも安全に出せる。
 *
 * 選択が他の理由(レール操作・並び替え・追加・削除後の自動選択・再生の
 * 進行)で変わったときは、そのコマが見えるところまで自動でスクロールする。
 * 自動選択を持たないので、この自動スクロールが選択を書き換え返す
 * 取り合いは起きない。
 *
 * サムネイル同士の間には、次のシーンへの遷移時間を示す矢印+秒数を
 * 挟んでいる。クリック対象ではなく見た目だけの要素で、「フォーメーション」と
 * 「その間の遷移」を視覚的に分けることで隣のコマとの誤クリックを減らす狙い。
 */
export function SceneTabs({
  scenes,
  selectedSceneId,
  onSelectScene,
  onReorderScenes,
  onDeleteScene,
  thumbnailBySceneId,
  stageWidthUnits,
  stageHeightUnits,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  // 並び替え用ドラッグは、軽くクリックしただけならonClick(選択)の方を
  // 発火させたいため、ステージ上のダンサードラッグと同じく一定距離
  // 動いて初めてドラッグ扱いにする
  const durations = sceneDurations(scenes);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  useEffect(() => {
    if (!selectedSceneId) return;
    const target = scrollRef.current?.querySelector<HTMLElement>(
      `[data-scene-id="${selectedSceneId}"]`,
    );
    // jsdom(テスト環境)にはscrollIntoViewが実装されていないため、
    // メソッド自体の有無もoptional chainingでガードしておく
    target?.scrollIntoView?.({
      behavior: "smooth",
      inline: "nearest",
      block: "nearest",
    });
  }, [selectedSceneId]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    onReorderScenes(
      reorderSceneIds(
        scenes.map((scene) => scene.id),
        String(active.id),
        String(over.id),
      ),
    );
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <SortableContext
        items={scenes.map((scene) => scene.id)}
        strategy={horizontalListSortingStrategy}
      >
        <div
          ref={scrollRef}
          data-testid="scene-strip"
          className="scrollbar-hide flex items-start gap-2 overflow-x-auto px-4"
        >
          {scenes.map((scene, index) => (
            <div key={scene.id} className="flex shrink-0 items-start gap-2">
              {/* 直前のシーンとの間の遷移時間。矢印+秒数を示すだけの
                  非クリック要素で、サムネイル本体の誤クリックと混同しない
                  ようにしている */}
              {index > 0 && (
                <div
                  aria-hidden
                  className="pointer-events-none flex shrink-0 flex-col items-center gap-0.5 pt-[22px] text-fg-muted"
                >
                  <ArrowRight size={12} />
                  <span className="font-mono text-[9px] whitespace-nowrap">
                    {durations[index]}s
                  </span>
                </div>
              )}
              <SceneThumbnail
                scene={scene}
                thumbnail={thumbnailBySceneId[scene.id]}
                stageWidthUnits={stageWidthUnits}
                stageHeightUnits={stageHeightUnits}
                isSelected={scene.id === selectedSceneId}
                onClick={() => onSelectScene(scene.id)}
                index={index + 1}
                sizePx={THUMBNAIL_SIZE_PX}
                showLabel
                onDelete={() => onDeleteScene(scene)}
              />
            </div>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
