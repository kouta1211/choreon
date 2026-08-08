"use client";

import { useEffect, useRef, useState } from "react";
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
import { ArrowRight, Pause, Play, Plus, ZoomIn, ZoomOut } from "lucide-react";
import { SceneThumbnail } from "@/features/scene/components/SceneThumbnail";
import { reorderSceneIds } from "@/features/scene/lib/sceneReorder";
import type { Dancer } from "@/features/dancer/types";
import type { Position, Scene } from "@/features/scene/types";

type Props = {
  scenes: Scene[];
  selectedSceneId: string | null;
  onSelectScene: (sceneId: string) => void;
  onAddScene: () => void;
  onReorderScenes: (orderedSceneIds: string[]) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  isCreating: boolean;
  dancers: Record<string, Dancer>;
  positionsBySceneId: Record<string, Record<string, Position>>;
  stageWidthUnits: number;
  stageHeightUnits: number;
};

/** サムネイルの幅(px)。ズーム操作で可変。大きいほど1コマの的が大きくなり、
 * クリック・タップの誤操作(隣のコマを押してしまう)を減らせる */
const DEFAULT_THUMBNAIL_SIZE_PX = 88;
const MIN_THUMBNAIL_SIZE_PX = 64;
const MAX_THUMBNAIL_SIZE_PX = 160;
const THUMBNAIL_ZOOM_STEP_PX = 16;

/**
 * シーンをミニチュアのステージ(各ダンサーの位置を点で表示)として横に並べた
 * ストリップ。切り替え・並び替えの3通りの操作を提供する:
 *
 * 1. クリック: そのシーンを直接選択する
 * 2. 横スクロール(トラックパッドのスワイプなど): CSSのscroll-snapで1コマずつ
 *    ぴったり止まるようになっており、止まった位置に一番近いコマを自動選択する
 * 3. 下のスライダー: シーン数ぶんの目盛りを持つ<input type="range">で、
 *    ドラッグするだけで一気に別のシーンまで移動できる(スクロールがしづらい
 *    トラックパッド以外の環境でも、1コマずつクリックせずに素早く切り替えられる)
 * 4. 再生ボタン: 現在のシーンから最後のシーンまで、各シーンのtransition
 *    DurationSecondsぶん待っては自動的に次へ進む(実際の再生処理・停止判定は
 *    親のSceneTimelineが持つ。ここはisPlayingの表示とトグルのみ)
 *
 * 並び替えはdnd-kitのSortableContextでコマ自体をドラッグして行う
 * (以前あった「隣と入れ替える」ボタンより直感的なため置き換えた)。
 *
 * 選択状態がクリック以外の理由(スライダー・並び替え・新規追加・削除後の
 * 自動選択など)で変わった場合は、そのシーンのコマが見えるところまで
 * 自動でスクロールする。
 *
 * サムネイル同士の間には、次のシーンへの遷移時間を示す矢印+秒数(コネクタ)を
 * 挟んでいる。クリック対象ではなく見た目だけの要素(pointer-events-none)で、
 * 「フォーメーション(サムネイル本体)」と「その間の遷移(所要時間)」を
 * 視覚的にはっきり分けることで、隣のコマとの誤クリックを減らす狙い。
 * ズーム(サムネイルの大きさ)を変えられるのも同じ狙いで、大きくすれば
 * 的が広がり誤操作しにくくなる。
 */
export function SceneTabs({
  scenes,
  selectedSceneId,
  onSelectScene,
  onAddScene,
  onReorderScenes,
  isPlaying,
  onTogglePlay,
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
  const [thumbnailSize, setThumbnailSize] = useState(
    DEFAULT_THUMBNAIL_SIZE_PX,
  );
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

  const selectedIndex = scenes.findIndex(
    (scene) => scene.id === selectedSceneId,
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end gap-1 text-zinc-500">
        <button
          type="button"
          onClick={() =>
            setThumbnailSize((size) =>
              Math.max(MIN_THUMBNAIL_SIZE_PX, size - THUMBNAIL_ZOOM_STEP_PX),
            )
          }
          disabled={thumbnailSize <= MIN_THUMBNAIL_SIZE_PX}
          aria-label="サムネイルを縮小"
          className="rounded p-1 hover:bg-zinc-700 disabled:opacity-30"
        >
          <ZoomOut size={14} />
        </button>
        <button
          type="button"
          onClick={() =>
            setThumbnailSize((size) =>
              Math.min(MAX_THUMBNAIL_SIZE_PX, size + THUMBNAIL_ZOOM_STEP_PX),
            )
          }
          disabled={thumbnailSize >= MAX_THUMBNAIL_SIZE_PX}
          aria-label="サムネイルを拡大"
          className="rounded p-1 hover:bg-zinc-700 disabled:opacity-30"
        >
          <ZoomIn size={14} />
        </button>
      </div>
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
            className="scrollbar-hide flex snap-x snap-mandatory items-center gap-3 overflow-x-auto pb-1"
          >
            {scenes.map((scene, index) => (
              <div
                key={scene.id}
                className="flex shrink-0 snap-start items-center gap-3"
              >
                {/* 直前のシーンとの間の遷移時間。矢印+秒数を示すだけの
                    非クリック要素で、サムネイル本体の誤クリックと混同しない
                    ようにしている(詳しくは上のdocコメント参照) */}
                {index > 0 && (
                  <div
                    aria-hidden
                    className="pointer-events-none flex shrink-0 flex-col items-center gap-0.5 text-zinc-500"
                  >
                    <ArrowRight size={12} />
                    <span className="text-[10px] whitespace-nowrap">
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
                  sizePx={thumbnailSize}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={onAddScene}
              disabled={isCreating}
              className="flex shrink-0 snap-start flex-col items-center gap-1 disabled:opacity-50"
              style={{ width: thumbnailSize }}
            >
              <span
                className="flex w-full items-center justify-center rounded-md border-2 border-dashed border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300"
                style={{
                  aspectRatio: `${stageWidthUnits} / ${stageHeightUnits}`,
                }}
              >
                <Plus size={20} />
              </span>
              <span className="text-xs text-zinc-400">シーンを追加</span>
            </button>
          </div>
        </SortableContext>
      </DndContext>

      {scenes.length > 1 && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={isPlaying ? "再生を停止" : "最後のシーンまで再生"}
            className="shrink-0 rounded-full bg-pink-500 p-1.5 text-white hover:bg-pink-400"
          >
            {isPlaying ? (
              <Pause size={14} fill="currentColor" />
            ) : (
              <Play size={14} fill="currentColor" />
            )}
          </button>
          <input
            type="range"
            name="scene-index"
            aria-label="シーンを切り替える"
            min={0}
            max={scenes.length - 1}
            step={1}
            value={selectedIndex === -1 ? 0 : selectedIndex}
            onChange={(event) => {
              const scene = scenes[Number(event.target.value)];
              if (scene) onSelectScene(scene.id);
            }}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-700 accent-pink-500"
          />
        </div>
      )}
    </div>
  );
}
