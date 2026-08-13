"use client";

import { useState, type FormEvent } from "react";
import { Minus, Plus } from "lucide-react";
import { BottomSheet } from "@/components/molecules/BottomSheet";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { persist } from "@/features/project/lib/persistence";
import { toUserMessage } from "@/lib/supabase/errors";
import { createDancers } from "@/features/dancer/api/dancers";
import { upsertPositions } from "@/features/scene/api/positions";
import { DANCER_COLOR_PALETTE } from "@/features/dancer/constants";
import {
  findFreePositions,
  nextDancerNames,
  pickDancerColors,
} from "@/features/dancer/lib/newDancers";
import type { Project } from "@/features/project/types";
import { themedDancerColor } from "@/features/dancer/lib/themedColor";
import { randomId } from "@/lib/randomId";
import { PressableButton } from "@/components/atoms/PressableButton";
import { useT } from "@/features/i18n/LocaleProvider";

type Props = {
  project: Project;
};

/** 一度に追加できる人数の上限。1グループの人数としては十分で、
 * これ以上はステージの空きマスの方が先に尽きる */
const MAX_COUNT = 20;

/**
 * ダンサーを追加するシート。聞くのは【人数だけ】。
 *
 * 名前は通し番号を自動で振り、色も自動で決める。どちらも後から
 * インスペクターで直せるうえ、追加の時点では「何人いるか」しか
 * 決まっていないことが多いため。1人ずつ名前を打たせると、人数ぶん
 * シートを開き直すことになる。
 *
 * 立ち位置は空いているマスを探して配る。以前は全員ステージ中央に
 * 置いていたので、続けて追加すると同じ場所に重なり、上の1人しか
 * 掴めなかった。
 */
export function AddDancerSheet({ project }: Props) {
  const t = useT();
  const [count, setCount] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isOpen = useUIStore((state) => state.isAddDancerSheetOpen);
  const setAddDancerSheetOpen = useUIStore(
    (state) => state.setAddDancerSheetOpen,
  );
  const dancers = useProjectStore((state) => state.dancers);
  const scenes = useProjectStore((state) => state.scenes);
  const addDancer = useProjectStore((state) => state.addDancer);
  const removeDancer = useProjectStore((state) => state.removeDancer);
  const updateDancerPosition = useProjectStore(
    (state) => state.updateDancerPosition,
  );
  const positionsBySceneId = useProjectStore(
    (state) => state.positionsBySceneId,
  );
  const selectedSceneId = useUIStore((state) => state.selectedSceneId);
  const showToast = useUIStore((state) => state.showToast);

  const existing = Object.values(dancers);
  const names = nextDancerNames(
    existing.map((dancer) => dancer.name),
    count,
  );
  const colors = pickDancerColors(
    existing.map((dancer) => dancer.color),
    count,
    DANCER_COLOR_PALETTE,
  );

  const close = () => {
    setCount(1);
    setAddDancerSheetOpen(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedSceneId) return;

    setIsSubmitting(true);
    const occupied = Object.values(positionsBySceneId[selectedSceneId] ?? {});
    const spots = findFreePositions(
      occupied,
      count,
      project.stageWidth,
      project.stageHeight,
    );

    const created = names.map((name, index) => ({
      id: randomId(),
      projectId: project.id,
      name,
      color: colors[index],
      initialDirection: 0,
      createdAt: new Date().toISOString(),
    }));
    // 【全シーンぶん】作る。以前は今開いているシーンにしか座標を作って
    // いなかったため、追加した直後に別のシーンへ移ると、その人だけ
    // 居なくなったように見えていた(座標が無い=描かれない)。
    // ダンサーは作品に属するものでシーンに属するものではないので、
    // どのシーンを開いても居るのが正しい。
    //
    // 立ち位置は全シーンで同じにする。「まだ動かしていない人」として
    // 同じ場所に立っている状態から始まり、動かしたシーンだけが変わっていく
    const targetScenes = scenes.length > 0 ? scenes : [{ id: selectedSceneId }];
    const positions = targetScenes.flatMap((scene) =>
      created.map((dancer, index) => ({
        sceneId: scene.id,
        dancerId: dancer.id,
        xCoordinate: spots[index].x,
        yCoordinate: spots[index].y,
        rotationAngle: 0,
      })),
    );

    // 楽観的更新: 先にローカルへ反映し、保存に失敗したらまとめて取り消す
    for (const dancer of created) addDancer(dancer);
    for (const position of positions) {
      updateDancerPosition(position.sceneId, position.dancerId, position);
    }
    close();

    try {
      await persist(async (supabase) => {
        await createDancers(supabase, created);
        await upsertPositions(supabase, positions);
      });
      showToast({
        message:
          created.length === 1
            ? t.dancer.add.addedOne(created[0].name)
            : t.dancer.add.addedMany(created.length),
        type: "success",
      });
    } catch (error) {
      for (const dancer of created) removeDancer(dancer.id);
      showToast({
        message: toUserMessage(error, t.dancer.add.failed),
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={close}
      title={t.dancer.add.title}
      wideMaxWidthClassName="min-[1200px]:max-w-md"
    >
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 px-[18px] pt-4 pb-5"
      >
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-fg-sub">
            {t.dancer.add.howMany}
          </span>
          <div className="flex items-center gap-3">
            <StepperButton
              label={t.dancer.add.minus}
              icon={Minus}
              onClick={() => setCount((value) => Math.max(1, value - 1))}
              disabled={count <= 1}
            />
            <input
              type="number"
              inputMode="numeric"
              aria-label={t.dancer.add.count}
              min={1}
              max={MAX_COUNT}
              value={count}
              onChange={(event) => {
                const parsed = Number(event.target.value);
                if (!Number.isFinite(parsed)) return;
                setCount(Math.min(MAX_COUNT, Math.max(1, Math.round(parsed))));
              }}
              className="h-[46px] w-20 rounded-[calc(var(--radius)*0.9167)] border border-line-strong bg-surface-strong text-center font-mono text-lg font-semibold text-fg-strong focus:border-accent focus:ring-[3px] focus:ring-accent/16 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <StepperButton
              label={t.dancer.add.plus}
              icon={Plus}
              onClick={() =>
                setCount((value) => Math.min(MAX_COUNT, value + 1))
              }
              disabled={count >= MAX_COUNT}
            />
            <span className="ml-1 text-sm text-fg-muted">
              {t.dancer.add.people}
            </span>
          </div>
        </div>

        {/* 何が作られるかを、追加する前に見せる */}
        <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface-raised p-3">
          <span className="text-caption font-medium text-fg-muted">
            {t.dancer.add.autoNote}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {names.map((name, index) => (
              <span
                key={name}
                className="flex items-center gap-1.5 rounded-full border border-line-strong bg-surface py-1 pr-2.5 pl-1.5"
              >
                <span
                  aria-hidden
                  className="block h-3.5 w-3.5 rounded-full"
                  style={{ backgroundColor: themedDancerColor(colors[index]) }}
                />
                <span className="font-mono text-caption font-semibold text-fg">
                  {name}
                </span>
              </span>
            ))}
          </div>
        </div>

        <p className="text-xs leading-relaxed text-fg-muted">
          {t.dancer.add.spotsNote}

        </p>

        <div className="flex gap-2">
          <PressableButton
            onClick={close}
            className="h-12 flex-1 rounded-[calc(var(--radius)*0.9167)] border border-line-strong text-sm font-medium text-fg-strong"
          >
            {t.dancer.add.cancel}
          </PressableButton>
          <PressableButton
            type="submit"
            disabled={!selectedSceneId || isSubmitting}
            className="h-12 flex-[2] rounded-[calc(var(--radius)*0.9167)] bg-accent text-body font-semibold text-accent-fg disabled:opacity-50"
          >
            {t.dancer.add.submit(count)}
          </PressableButton>
        </div>
      </form>
    </BottomSheet>
  );
}

function StepperButton({
  label,
  icon: Icon,
  onClick,
  disabled,
}: {
  label: string;
  icon: typeof Plus;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <PressableButton
      kind="icon"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[calc(var(--radius)*0.9167)] border border-line-strong text-fg disabled:opacity-30"
    >
      <Icon size={18} />
    </PressableButton>
  );
}
