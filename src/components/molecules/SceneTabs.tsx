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
import { ArrowRight, Plus } from "lucide-react";
import { SceneThumbnail } from "@/components/molecules/SceneThumbnail";
import { reorderSceneIds } from "@/features/scene/lib/sceneReorder";
import type { Dancer } from "@/features/dancer/types";
import type { Position, Scene } from "@/features/scene/types";

type Props = {
  scenes: Scene[];
  selectedSceneId: string | null;
  onSelectScene: (sceneId: string) => void;
  onAddScene: () => void;
  onReorderScenes: (orderedSceneIds: string[]) => void;
  isCreating: boolean;
  dancers: Record<string, Dancer>;
  positionsBySceneId: Record<string, Record<string, Position>>;
  stageWidthUnits: number;
  stageHeightUnits: number;
};

/** コマの幅(px)。以前は64〜160pxのズーム操作があったが、拡大しないと
 * 読めないほどの情報はシーン一覧シートへ移したため、ドックのコマは
 * 「今どこにいるか」を示す指標に徹してよくなった。固定幅にすることで
 * ズームボタン2つぶんの高さも返せる */
const THUMBNAIL_SIZE_PX = 74;

/**
 * シーンをミニチュアのステージとして横に並べたストリップ。
 * 切り替えと並び替えの手段:
 *
 * 1. クリック: そのシーンを直接選択する
 * 2. 横スクロール: CSSのscroll-snapで1コマずつ止まり、止まった位置に
 *    一番近いコマを自動選択する
 * 3. コマ自体をドラッグ: 並び替え(dnd-kitのSortableContext)
 *
 * 選択状態がクリック以外の理由(レール操作・並び替え・新規追加・削除後の
 * 自動選択など)で変わった場合は、そのコマが見えるところまで自動でスクロールする。
 *
 * サムネイル同士の間には、次のシーンへの遷移時間を示す矢印+秒数(コネクタ)を
 * 挟んでいる。クリック対象ではなく見た目だけの要素で、「フォーメーション」と
 * 「その間の遷移」を視覚的に分けることで隣のコマとの誤クリックを減らす狙い。
 */
export function SceneTabs({
  scenes,
  selectedSceneId,
  onSelectScene,
  onAddScene,
  onReorderScenes,
  isCreating,
  dancers,
  positionsBySceneId,
  stageWidthUnits,
  stageHeightUnits,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollEndTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  // 「今起きているスクロールは、選択が変わったことによる自動スクロール
  // (下のuseEffectのscrollIntoView)である」ことを示す目印。
  // これが無いと『選択が変わる→自動スクロール→そのスクロールを検知して
  // 別のシーンを選び直す→また自動スクロール』という取り合いが起きる
  // (実際、再生が1歩で止まったり、クリックしたのと違うコマが選ばれたりする)。
  // 目印は「スクロールが止まった」と判定した時点で下ろし、ユーザー自身の
  // 操作(ホイール・タッチ・ドラッグ)が始まった時にも下ろす
  // ―そちらは本物のスクロールなので選択に反映してよいため
  const isProgrammaticScrollRef = useRef(false);
  // 並び替え用ドラッグは、軽くクリックしただけならonClick(選択)の方を
  // 発火させたいため、ステージ上のダンサードラッグと同じく一定距離
  // 動いて初めてドラッグ扱いにする
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  useEffect(() => {
    if (!selectedSceneId) return;
    const container = scrollRef.current;
    const target = container?.querySelector<HTMLElement>(
      `[data-scene-id="${selectedSceneId}"]`,
    );
    // これから起こすスクロールは自動スクロールなので、選択の反映対象から外す
    isProgrammaticScrollRef.current = true;
    // jsdom(テスト環境)にはscrollIntoViewが実装されていないため、
    // メソッド自体の有無もoptional chainingでガードしておく
    //
    // inlineは"start"にしている。コンテナのCSSがsnap-start(コマの左端で
    // 止まる)であり、下のhandleScrollも「左端に一番近いコマ」で判定して
    // いるため、ここだけ"center"だと三者の基準がバラバラになるため
    target?.scrollIntoView?.({
      behavior: "smooth",
      inline: "start",
      block: "nearest",
    });
  }, [selectedSceneId]);

  const handleScroll = () => {
    if (scrollEndTimeoutRef.current) {
      clearTimeout(scrollEndTimeoutRef.current);
    }
    // スクロール中は毎フレームのように発火するため、止まってから
    // 120ms経ったところを「スクロール確定」とみなして選択を切り替える。
    // コマ同士の間隔はコネクタ(遷移時間の矢印表示)の分だけ均一ではないため、
    // 単純な「scrollLeft ÷ 1コマぶんのpx」の計算ではなく、「今コンテナの
    // 左端に一番近いコマ」を実際のDOM座標(getBoundingClientRect)から探す。
    // offsetLeftは使わない: 最寄りのposition:relative祖先を基準にする値で、
    // このスクロールコンテナ基準になるとは限らないため
    // (実際に検証中、大きくズレる状況を確認した)
    scrollEndTimeoutRef.current = setTimeout(() => {
      // 自動スクロール(選択の結果として起きたスクロール)なら、選択を
      // 上書きし返さずに目印を下ろすだけで終わる
      if (isProgrammaticScrollRef.current) {
        isProgrammaticScrollRef.current = false;
        return;
      }
      const container = scrollRef.current;
      if (!container) return;
      const thumbnails = Array.from(
        container.querySelectorAll<HTMLElement>("[data-scene-id]"),
      );
      if (thumbnails.length === 0) return;

      const containerLeft = container.getBoundingClientRect().left;
      let closest = thumbnails[0];
      let closestDistance = Math.abs(
        closest.getBoundingClientRect().left - containerLeft,
      );
      for (const thumbnail of thumbnails) {
        const distance = Math.abs(
          thumbnail.getBoundingClientRect().left - containerLeft,
        );
        if (distance < closestDistance) {
          closest = thumbnail;
          closestDistance = distance;
        }
      }

      const sceneId = closest.dataset.sceneId;
      if (sceneId && sceneId !== selectedSceneId) {
        onSelectScene(sceneId);
      }
    }, 120);
  };

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
          onScroll={handleScroll}
          // ユーザー自身がスクロールを始めた合図。ここで目印を下ろすことで、
          // 自動スクロールの直後(まだ目印が立ったまま)に手で動かした場合でも
          // その操作はきちんと選択に反映される
          onWheel={() => {
            isProgrammaticScrollRef.current = false;
          }}
          onTouchStart={() => {
            isProgrammaticScrollRef.current = false;
          }}
          className="scrollbar-hide flex snap-x snap-mandatory items-start gap-2 overflow-x-auto px-3.5"
        >
          {scenes.map((scene, index) => (
            <div
              key={scene.id}
              className="flex shrink-0 snap-start items-start gap-2"
            >
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
                    {scene.transitionDurationSeconds}s
                  </span>
                </div>
              )}
              <SceneThumbnail
                scene={scene}
                positions={positionsBySceneId[scene.id] ?? {}}
                dancers={dancers}
                stageWidthUnits={stageWidthUnits}
                stageHeightUnits={stageHeightUnits}
                isSelected={scene.id === selectedSceneId}
                onClick={() => onSelectScene(scene.id)}
                index={index + 1}
                sizePx={THUMBNAIL_SIZE_PX}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={onAddScene}
            disabled={isCreating}
            aria-label="シーンを追加"
            className="shrink-0 snap-start disabled:opacity-50"
            style={{ width: 52 }}
          >
            <span
              className="flex w-full items-center justify-center rounded-md border-2 border-dashed border-line-strong text-fg-muted"
              style={{
                aspectRatio: `${stageWidthUnits} / ${stageHeightUnits}`,
              }}
            >
              <Plus size={18} />
            </span>
          </button>
        </div>
      </SortableContext>
    </DndContext>
  );
}
