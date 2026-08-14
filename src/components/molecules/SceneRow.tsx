"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Copy, Trash2 } from "lucide-react";
import { SceneThumbnail } from "@/components/molecules/SceneThumbnail";
import { InlineEditableText } from "@/components/molecules/InlineEditableText";
import {
  formatClock,
  SceneTimeField,
} from "@/components/molecules/SceneTimeField";
import { PressableButton } from "@/components/atoms/PressableButton";
import { isDragStartAllowed } from "@/features/scene/lib/sceneRowSensors";
import type { Project } from "@/features/project/types";
import type { Scene } from "@/features/scene/types";
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
  // attributes(role="button" など)は渡さない。キーボードでの並び替え
  // (KeyboardSensor)を入れていないうえ、ボタンを内包する行を button として
  // 読み上げさせることになるため
  const { listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: scene.id });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      // カードのどこを触ってもそのシーンへ切り替わる。ミニチュアだけが
      // 反応する作りだと、幅いっぱいのカードのうち左端しか押せず、
      // 特に指では押し外しやすい。
      //
      // ボタン・入力欄の上で押したときは、その操作だけを起こす(判定は
      // 掴み始めと同じ isDragStartAllowed。境目の定義を1箇所にしている)
      onClick={(event) => {
        if (!isDragStartAllowed(event.target)) return;
        onSelect();
      }}
      className={`touch-manipulation cursor-pointer overflow-hidden rounded-xl ${
        isDragging ? "relative z-10 opacity-70" : ""
      } ${
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
            {formatClock(scene.timeSeconds)}
            {index > 0 && t.editor.scenes.moveIn(segmentSeconds)}
            {isSelected && t.editor.scenes.showing}
          </span>
        </div>
      </div>

      {/* 時刻と複製・削除は選択中の行にだけ出す。
          全行に並べると一覧として読めなくなる */}
      {isSelected && (
        <div className="flex flex-col gap-2 px-2.5 pb-2.5">
          <SceneTimeField
            fieldKey={scene.id}
            timeSeconds={scene.timeSeconds}
            segmentSeconds={segmentSeconds}
            isFirst={index === 0}
            onCommit={onChangeTime}
          />
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
