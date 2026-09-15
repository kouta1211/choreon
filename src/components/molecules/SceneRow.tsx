"use client";

import { useEffect, useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, Trash2 } from "lucide-react";
import { SceneThumbnail } from "@/components/molecules/SceneThumbnail";
import { InlineEditableText } from "@/components/molecules/InlineEditableText";
import { SceneTimeField } from "@/components/molecules/SceneTimeField";
import { PressableButton } from "@/components/atoms/PressableButton";
import { isRowSelectClick } from "@/features/scene/lib/sceneRowSensors";
import type { Project } from "@/features/project/types";
import type { Scene } from "@/features/scene/types";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useT } from "@/features/i18n/LocaleProvider";
import type { OutgoingSegment } from "@/features/scene/lib/outgoingSegment";
import { countLengthLabel } from "@/features/music/lib/counts";
import { countLabelAtBeat } from "@/features/music/lib/countLabel";
import { useMusicStore } from "@/features/music/store/useMusicStore";

type Props = {
  scene: Scene;
  index: number;
  isSelected: boolean;
  /** 「選ぶ」モードに入っているか。入っている間、行は消す相手を決める場所になる */
  isSelecting: boolean;
  /** 消す相手として印が付いているか（モードに入っていないときは常に false） */
  isChecked: boolean;
  project: Project;
  thumbnail: string | undefined;
  thumbnailSizePx: number;
  /** このシーンから**次のシーンへ出ていく**区間。最後のシーンは null。
   * 引くのは `lib/outgoingSegment` — ここへ条件を書き足さない */
  outgoing: OutgoingSegment | null;
  onSelect: () => void;
  onRename: (name: string) => void;
  onChangeBeats: (positionBeats: number) => void;
  /** 出ていく区間の移動時間を変える。null で区間まるごとへ戻す。
   * **書き込む先は次のシーン**（結ぶのは SceneList） */
  onChangeMoveBeats: (moveBeats: number | null) => void;
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
  isSelecting,
  isChecked,
  project,
  thumbnail,
  thumbnailSizePx,
  outgoing,
  onSelect,
  onRename,
  onChangeBeats,
  onChangeMoveBeats,
  onDelete,
}: Props) {
  const t = useT();
  const hasMusic = useMusicStore((state) => state.objectUrl !== null);
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
        /* 「印が付いている」と「いま見ている」は別のこと。
           選ぶモードの間は**印の方**を強く見せる — 決めているのは
           消す相手であって、どこを見ているかではない */
        isChecked
          ? "border-2 border-accent bg-accent-row"
          : isSelected && !isSelecting
            ? "border-2 border-accent bg-accent-row"
            : "border border-line bg-surface-raised"
      }`}
    >
      <div className="flex items-center gap-unit p-unit">
        {isSelecting && (
          /* 見た目だけ。押す相手は行そのもの（ここにボタンを置くと、
             升の外を押したときだけ何も起きない、という当たり外れができる） */
          <span
            aria-hidden
            data-testid="scene-check"
            data-checked={isChecked}
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
              isChecked
                ? "border-accent bg-accent text-white"
                : "border-line-strong"
            }`}
          >
            {isChecked && <Check size={13} strokeWidth={3} />}
          </span>
        )}
        <SceneThumbnail
          scene={scene}
          thumbnail={thumbnail}
          stageWidthUnits={project.stageWidth}
          stageHeightUnits={project.stageHeight}
          isSelected={isSelected}
          onClick={onSelect}
          sizePx={thumbnailSizePx}
          showGrid
          onDelete={isSelecting ? undefined : onDelete}
          // 名前と番号はカードの右側に別レイアウトで組むため、
          // ミニチュア側の見出しは出さない
        />
        <div className="min-w-0 flex-1">
          {/* keyにシーンIDを渡して、並び替えなどで行が入れ替わった
              ときに編集中の入力欄が別のシーンへ持ち越されないようにする */}
          {/* 選ぶモードの間、名前は**押せない字**にする。押すと編集が
              始まってしまうと、行のどこを押しても印が付く、が崩れる */}
          {isSelecting ? (
            <p className="flex items-center gap-1.5 truncate text-sm font-medium">
              <span className="shrink-0 font-mono text-caption font-semibold text-fg-muted">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="truncate">{scene.name}</span>
            </p>
          ) : (
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
          )}
          {/* 「表示中」の札は出さない(実機の報告 17-4)。選んでいる行は
              敷き色と番号の色で既に分かるので、文字で言うと二重になる */}
          <span
            className={`mt-1 block font-mono text-caption ${
              isSelected ? "text-accent-bright" : "text-fg-muted"
            }`}
          >
            {countLabelAtBeat(
              scene.positionBeats,
              project.musicPlacements,
              t.music.sectionDefaultName,
            )}
            {/* **出ていく側**の区間を出す（2026-08-25）。
                すぐ下の 滞在／移動 と同じ区間でなければ、
                1つの行が2つの区間の話をすることになる。
                最後のシーンには行き先が無いので出さない */}
            {outgoing !== null &&
              t.editor.scenes.moveOut(countLengthLabel(outgoing.segmentBeats))}
          </span>
        </div>
      </div>

      {/* 時刻と複製・削除は選択中の行にだけ出す。
          全行に並べると一覧として読めなくなる */}
      {isSelected && !isSelecting && (
        <div className="flex flex-col gap-unit px-unit pb-unit">
          <SceneTimeField
            fieldKey={scene.id}
            positionBeats={scene.positionBeats}
            placements={project.musicPlacements}
            timeSeconds={scene.timeSeconds}
            /* 秒を添えるのは曲に載せているときだけ。合わせる相手が
               無い作品で `0:07.0` を出しても、振付として意味を持たない */
            showSeconds={hasMusic}
            onCommit={onChangeBeats}
            outgoing={outgoing}
            onCommitMoveBeats={onChangeMoveBeats}
          />
          <div className="flex gap-unit">
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
  icon: typeof Trash2;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
}) {
  return (
    <PressableButton
      onClick={onClick}
      disabled={disabled}
      className={`flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border bg-surface text-xs font-medium whitespace-nowrap disabled:opacity-50 ${
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
