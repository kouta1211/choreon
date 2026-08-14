"use client";

import type { MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from "react";
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Copy, Plus, Trash2 } from "lucide-react";
import { SceneThumbnail } from "@/components/molecules/SceneThumbnail";
import { InlineEditableText } from "@/components/molecules/InlineEditableText";
import {
  formatClock,
  SceneTimeField,
} from "@/components/molecules/SceneTimeField";
import { sceneDurations } from "@/features/scene/lib/sceneTiming";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { reorderSceneIds } from "@/features/scene/lib/sceneReorder";
import { useAddScene } from "@/features/scene/hooks/useAddScene";
import { useDuplicateScene } from "@/features/scene/hooks/useDuplicateScene";
import { useSceneActions } from "@/features/scene/hooks/useSceneActions";
import type { Project } from "@/features/project/types";
import type { Scene } from "@/features/scene/types";
import { PressableButton } from "@/components/atoms/PressableButton";
import { useT } from "@/features/i18n/LocaleProvider";

type Props = {
  project: Project;
  /** サムネイルの幅(px)。シートは78px、狭いサイドバーでは64px */
  thumbnailSizePx?: number;
};

/**
 * 押し始めた場所が操作の上なら、並び替えを始めない。
 *
 * 行のどこを掴んでも並び替わる作りにしたので、行の中のボタン(鉛筆・複製・
 * 削除・ミニチュア・×)や入力欄まで「掴んだ」に飲み込まれる。判定は行の
 * onClick が既に持っている規則と同じものを使い、境目を1か所に揃える。
 */
function isDragStartAllowed(target: EventTarget | null): boolean {
  return !(target instanceof Element && target.closest("button, input"));
}

/** マウス用。8px 動かしたら並び替え(軽く押しただけなら選択) */
class RowMouseSensor extends MouseSensor {
  static activators = [
    {
      eventName: "onMouseDown" as const,
      handler: ({ nativeEvent }: ReactMouseEvent) =>
        isDragStartAllowed(nativeEvent.target),
    },
  ];
}

/**
 * 指用。【長押ししてから】並び替え。
 *
 * 指でも「距離で始める」にすると、行に touch-action: none が要る。それを
 * 付けると一覧そのものを指でスクロールできなくなる(行が画面の大半を
 * 占めるため)。長押しで始める形なら、素早く払えばスクロール、押さえて
 * から動かせば並び替え、と両方が同じ場所で成立する。
 *
 * tolerance は「長押しの間に動いてよい幅」。これを超えたらスクロールの
 * つもりだったと見なして、並び替えを始めない。
 */
class RowTouchSensor extends TouchSensor {
  static activators = [
    {
      eventName: "onTouchStart" as const,
      handler: ({ nativeEvent }: ReactTouchEvent) =>
        isDragStartAllowed(nativeEvent.target),
    },
  ];
}

/**
 * シーンを縦に並べた一覧。シーンに対する操作(並び替え・改名・遷移時間・
 * 複製・削除)はすべてここにある。下部のドックは「今どこにいるか」を
 * 見せるだけの場所にして、いじる操作はこちらへ寄せてある。
 *
 * 置き場所は画面幅で変わる。狭いときはドックの「一覧」から開くボトム
 * シートの中身、広いときはステージ横のサイドバーの中身。どちらでも同じ
 * ものを見せたいので、外枠を持たない中身だけの部品にしてある。
 *
 * 鉛筆(改名)は全行に出すが、遷移時間・複製・削除は選択中の行にだけ出す。
 * 改名は「そのシーンを選ぶ」こととは無関係にやりたくなるのに対し、
 * 残りは今いじっているシーンにしか使わない操作で、全行に並べると
 * 一覧として読めなくなるため。
 */
export function SceneList({ project, thumbnailSizePx = 78 }: Props) {
  const t = useT();
  const selectedSceneId = useUIStore((state) => state.selectedSceneId);
  const scenes = useProjectStore((state) => state.scenes);
  const thumbnailBySceneId = useProjectStore(
    (state) => state.thumbnailBySceneId,
  );
  const { addScene, isCreating } = useAddScene(project);
  const { duplicateScene, isDuplicating } = useDuplicateScene(project);
  const {
    renameSceneTo,
    reorderTo,
    changeSceneTime,
    confirmDelete,
    selectSceneManually,
  } = useSceneActions();

  const sensors = useSensors(
    useSensor(RowMouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(RowTouchSensor, {
      activationConstraint: { delay: 250, tolerance: 8 },
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    reorderTo(
      reorderSceneIds(
        scenes.map((scene) => scene.id),
        String(active.id),
        String(over.id),
      ),
    );
  };

  const durations = sceneDurations(scenes);

  return (
    <div className="flex flex-col gap-2">
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <SortableContext
          items={scenes.map((scene) => scene.id)}
          strategy={verticalListSortingStrategy}
        >
          {scenes.map((scene, index) => (
            <SceneRow
              key={scene.id}
              scene={scene}
              index={index}
              isSelected={scene.id === selectedSceneId}
              project={project}
              thumbnail={thumbnailBySceneId[scene.id]}
              thumbnailSizePx={thumbnailSizePx}
              segmentSeconds={durations[index]}
              isDuplicating={isDuplicating}
              onSelect={() => selectSceneManually(scene.id)}
              onRename={(name) => renameSceneTo(scene, name)}
              onChangeTime={(seconds, ripple) =>
                changeSceneTime(scene, seconds, ripple)
              }
              onDuplicate={() => duplicateScene(scene)}
              onDelete={() => confirmDelete(scene)}
            />
          ))}
        </SortableContext>
      </DndContext>

      <PressableButton
        onClick={addScene}
        disabled={isCreating}
        className="flex h-13 items-center justify-center gap-1.5 rounded-xl border border-dashed border-line-strong text-label font-medium whitespace-nowrap text-fg-sub disabled:opacity-50"
      >
        <Plus size={15} className="shrink-0" />
        {t.editor.copyCurrent}
      </PressableButton>
    </div>
  );
}

type RowProps = {
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
 * 一覧の1行。【行そのものが並び替えのつまみ】。
 *
 * 以前は左端のミニチュア(SceneThumbnail)だけが掴めた。幅いっぱいのカードの
 * うち小さな四角だけが反応する作りで、並び替えのたびにそこを狙う必要が
 * あった。掴む役目を行へ移し、ミニチュアは「選ぶボタン」に戻している。
 *
 * hooks を呼ぶので、一覧の map の中に直接書かず部品として切り出している。
 */
function SceneRow({
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
}: RowProps) {
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
      // 特に指では押し外しやすい
      onClick={(event) => {
        // ボタン・入力欄の上で押したときは、その操作だけを起こす。
        // ミニチュアも <PressableButton> なのでここで抜けるが、あちらは
        // 自分の onClick で選択するので結果は同じ
        if (
          event.target instanceof Element &&
          event.target.closest("button, input")
        ) {
          return;
        }
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
            <SheetAction
              icon={Copy}
              label={t.editor.scenes.duplicate}
              disabled={isDuplicating}
              onClick={onDuplicate}
            />
            <SheetAction
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

function SheetAction({
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
