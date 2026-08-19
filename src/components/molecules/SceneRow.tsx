"use client";

import { useEffect, useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Copy, Trash2 } from "lucide-react";
import { SceneThumbnail } from "@/components/molecules/SceneThumbnail";
import { InlineEditableText } from "@/components/molecules/InlineEditableText";
import {
  formatClock,
  SceneTimeField,
} from "@/components/molecules/SceneTimeField";
import { SceneDurationField } from "@/components/molecules/SceneDurationField";
import { useOrderOnlyTimeline } from "@/features/scene/hooks/useOrderOnlyTimeline";
import { PressableButton } from "@/components/atoms/PressableButton";
import { isRowSelectClick } from "@/features/scene/lib/sceneRowSensors";
import type { Project } from "@/features/project/types";
import type { Scene } from "@/features/scene/types";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useT } from "@/features/i18n/LocaleProvider";

type Props = {
  scene: Scene;
  index: number;
  isSelected: boolean;
  project: Project;
  thumbnail: string | undefined;
  thumbnailSizePx: number;
  /** このシーンへ入ってくるのにかかる秒数 */
  segmentSeconds: number;
  isDuplicating: boolean;
  onSelect: () => void;
  onRename: (name: string) => void;
  onChangeTime: (seconds: number, ripple: boolean) => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

/**
 * シーン一覧の1行。【行そのものが並び替えのつまみ】。
 *
 * 以前は左端のミニチュア(SceneThumbnail)だけが掴めた。幅いっぱいのカードの
 * うち小さな四角だけが反応する作りで、並び替えのたびにそこを狙う必要が
 * あった。掴む役目を行へ移し、ミニチュアは「選ぶボタン」に戻している。
 *
 * 始まり方(マウスは距離・指は長押し)は親の DndContext が持つセンサーが
 * 決める(sceneRowSensors)。ここは掴まれる側。
 */
export function SceneRow({
  scene,
  index,
  isSelected,
  project,
  thumbnail,
  thumbnailSizePx,
  segmentSeconds,
  isDuplicating,
  onSelect,
  onRename,
  onChangeTime,
  onDuplicate,
  onDelete,
}: Props) {
  const t = useT();
  const isOrderOnly = useOrderOnlyTimeline();
  // attributes(role="button" など)は渡さない。キーボードでの並び替え
  // (KeyboardSensor)を入れていないうえ、ボタンを内包する行を button として
  // 読み上げさせることになるため
  const { listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: scene.id });

  /* 足したばかりのシーンへ寄せて、一拍光らせる。
     曲が無いときの追加は**選んでいるシーンの隣**へ入るので、末尾へ
     積まれるのを見慣れた目には「増えたのが見えない」。

     印は少ししたら自分で消す(そのままだと、別の操作をしても光ったまま)。
     scrollIntoView は掴んでいる最中には呼ばない — 並び替えの途中で
     一覧が動くと、指の下から行が逃げる。 */
  const isJustAdded = useUIStore(
    (state) => state.justAddedSceneId === scene.id,
  );
  const markSceneAdded = useUIStore((state) => state.markSceneAdded);
  const rowRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!isJustAdded) return;
    rowRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    const timer = setTimeout(() => markSceneAdded(null), 1200);
    return () => clearTimeout(timer);
  }, [isJustAdded, markSceneAdded]);

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        rowRef.current = node;
      }}
      {...listeners}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      // カードのどこを触ってもそのシーンへ切り替わる。ミニチュアだけが
      // 反応する作りだと、幅いっぱいのカードのうち左端しか押せず、
      // 特に指では押し外しやすい。
      //
      // ボタン・入力欄の上で押したときは、その操作だけを起こす
      // (境目の定義は sceneRowSensors に置いて、そこ1箇所で決める)
      onClick={(event) => {
        if (!isRowSelectClick(event.target)) return;
        onSelect();
      }}
      className={`touch-manipulation cursor-pointer overflow-hidden rounded-xl ${
        isDragging ? "relative z-10 opacity-70" : ""
      } ${isJustAdded ? "scene-row-added" : ""} ${
        isSelected
          ? "border-2 border-accent bg-accent-row"
          : "border border-line bg-surface-raised"
      }`}
    >
      <div className="flex items-center gap-2.5 p-2.5">
        <SceneThumbnail
          scene={scene}
          thumbnail={thumbnail}
          stageWidthUnits={project.stageWidth}
          stageHeightUnits={project.stageHeight}
          isSelected={isSelected}
          onClick={onSelect}
          sizePx={thumbnailSizePx}
          showGrid
          onDelete={onDelete}
          // 名前と番号はカードの右側に別レイアウトで組むため、
          // ミニチュア側の見出しは出さない
        />
        <div className="min-w-0 flex-1">
          {/* keyにシーンIDを渡して、並び替えなどで行が入れ替わった
              ときに編集中の入力欄が別のシーンへ持ち越されないようにする */}
          <InlineEditableText
            key={scene.id}
            value={scene.name}
            onCommit={onRename}
            label={t.editor.scenes.sceneName}
            textClassName={
              isSelected ? "text-sm font-semibold" : "text-sm font-medium"
            }
            prefix={
              <span
                className={`shrink-0 font-mono text-caption font-semibold ${
                  isSelected ? "text-accent-soft" : "text-fg-muted"
                }`}
              >
                {String(index + 1).padStart(2, "0")}
              </span>
            }
            fullWidth
          />
          <span
            className={`mt-1 block font-mono text-caption ${
              isSelected ? "text-accent-bright" : "text-fg-muted"
            }`}
          >
            {isOrderOnly
              ? index > 0 && t.editor.scenes.segment(segmentSeconds)
              : [
                  formatClock(scene.timeSeconds),
                  index > 0 ? t.editor.scenes.moveIn(segmentSeconds) : "",
                ].join("")}
            {isSelected && t.editor.scenes.showing}
          </span>
        </div>
      </div>

      {/* 時刻と複製・削除は選択中の行にだけ出す。
          全行に並べると一覧として読めなくなる */}
      {isSelected && (
        <div className="flex flex-col gap-2 px-2.5 pb-2.5">
          {/* 合わせる相手（曲・拍）が無いときは、時刻ではなく
              「何秒で動くか」を入れさせる。先頭のシーンには入ってくる元が
              無いので、そのときは何も出さない（理由は lib/timelineMode） */}
          {isOrderOnly ? (
            index > 0 && (
              <SceneDurationField
                fieldKey={scene.id}
                segmentSeconds={segmentSeconds}
                onCommit={(seconds) =>
                  onChangeTime(
                    scene.timeSeconds - segmentSeconds + seconds,
                    true,
                  )
                }
              />
            )
          ) : (
            <SceneTimeField
              fieldKey={scene.id}
              timeSeconds={scene.timeSeconds}
              segmentSeconds={segmentSeconds}
              isFirst={index === 0}
              onCommit={onChangeTime}
            />
          )}
          <div className="flex gap-1.5">
            <RowAction
              icon={Copy}
              label={t.editor.scenes.duplicate}
              disabled={isDuplicating}
              onClick={onDuplicate}
            />
            <RowAction
              icon={Trash2}
              label={t.editor.scenes.delete}
              tone="danger"
              onClick={onDelete}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/** 選択中の行にだけ出る、複製と削除のボタン */
function RowAction({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  tone = "default",
}: {
  icon: typeof Copy;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
}) {
  return (
    <PressableButton
      onClick={onClick}
      disabled={disabled}
      className={`flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[calc(var(--radius)*0.75)] border bg-surface text-xs font-medium whitespace-nowrap disabled:opacity-50 ${
        tone === "danger"
          ? "border-red-950 text-red-400"
          : "border-line-strong text-fg"
      }`}
    >
      <Icon size={13} className="shrink-0" />
      {label}
    </PressableButton>
  );
}
