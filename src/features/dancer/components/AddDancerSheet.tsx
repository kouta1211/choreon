"use client";

import { useState, type FormEvent } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { createClient } from "@/lib/supabase/client";
import { toUserMessage } from "@/lib/supabase/errors";
import { createDancer } from "@/features/dancer/api/dancers";
import { upsertPosition } from "@/features/scene/api/positions";
import { DANCER_COLOR_PALETTE } from "@/features/dancer/constants";
import type { Project } from "@/features/project/types";

type Props = {
  project: Project;
};

/**
 * ダンサーを追加するシート。
 *
 * 以前は「名前 + 追加」の1行フォームがステージの上に常駐していた。
 * 追加は最初に何度かやったらしばらく使わない操作なので、常に画面の
 * 一等地を占めているのは割に合わない。シートへ移して、そのぶんの高さを
 * ステージに回した。
 *
 * 場所が広くなったぶん、これまで説明できなかったことを2つ入れている:
 * 割り当てられる色を先に見せること(あとで変えられることも添える)と、
 * 追加された人がどこに立つのか(いま見ているシーンのステージ中央)を
 * ミニチュアで示すこと。以前は追加してから初めて分かる仕様だった。
 */
export function AddDancerSheet({ project }: Props) {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isOpen = useUIStore((state) => state.isAddDancerSheetOpen);
  const setAddDancerSheetOpen = useUIStore(
    (state) => state.setAddDancerSheetOpen,
  );
  const dancers = useProjectStore((state) => state.dancers);
  const addDancer = useProjectStore((state) => state.addDancer);
  const removeDancer = useProjectStore((state) => state.removeDancer);
  const updateDancerPosition = useProjectStore(
    (state) => state.updateDancerPosition,
  );
  const selectedSceneId = useUIStore((state) => state.selectedSceneId);
  const showToast = useUIStore((state) => state.showToast);

  const dancerCount = Object.keys(dancers).length;
  const nextColorIndex = dancerCount % DANCER_COLOR_PALETTE.length;
  const nextColor = DANCER_COLOR_PALETTE[nextColorIndex];

  const close = () => {
    setName("");
    setAddDancerSheetOpen(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || !selectedSceneId) return;

    setIsSubmitting(true);
    const id = crypto.randomUUID();
    const dancer = {
      id,
      projectId: project.id,
      name: trimmedName,
      color: nextColor,
      initialDirection: 0,
      createdAt: new Date().toISOString(),
    };
    const position = {
      sceneId: selectedSceneId,
      dancerId: id,
      xCoordinate: project.stageWidth / 2,
      yCoordinate: project.stageHeight / 2,
      rotationAngle: 0,
    };

    addDancer(dancer);
    updateDancerPosition(position.sceneId, position.dancerId, position);
    close();

    try {
      const supabase = createClient();
      await createDancer(supabase, dancer);
      await upsertPosition(supabase, position);
      showToast({
        message: `${trimmedName} をステージ中央に追加しました`,
        type: "success",
      });
    } catch (error) {
      removeDancer(id);
      showToast({
        message: toUserMessage(error, "ダンサーの追加に失敗しました"),
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={close} title="ダンサーを追加">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 px-[18px] pt-4 pb-5">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-zinc-400">名前</span>
          <input
            autoFocus
            type="text"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={!selectedSceneId}
            className="h-[46px] rounded-[11px] border border-zinc-700 bg-zinc-800 px-3 text-[15px] font-medium text-zinc-50 focus:border-pink-500 focus:ring-[3px] focus:ring-pink-500/16 focus:outline-none disabled:opacity-50"
          />
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-zinc-400">
            色（自動で次の色になります）
          </span>
          <div className="flex items-center gap-2">
            {DANCER_COLOR_PALETTE.map((color, index) => (
              <span
                key={color}
                aria-hidden
                className={`block h-[34px] w-[34px] rounded-full ${
                  index === nextColorIndex
                    ? "ring-2 ring-pink-500 ring-offset-2 ring-offset-zinc-900"
                    : "opacity-35"
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <span className="text-[10.5px] leading-relaxed text-zinc-500">
            {dancerCount + 1}人めの色になります。あとからインスペクターで変更できます
          </span>
        </div>

        {/* どこに立つのかを、言葉だけでなくミニチュアでも示す */}
        <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-[#1f1f23] p-3">
          <div
            aria-hidden
            className="relative w-[86px] shrink-0 overflow-hidden rounded-[7px] border border-zinc-700 bg-[#0f0f11]"
            style={{
              aspectRatio: `${project.stageWidth} / ${project.stageHeight}`,
            }}
          >
            <div
              className="absolute inset-0 bg-[linear-gradient(to_right,#232329_1px,transparent_1px),linear-gradient(to_bottom,#232329_1px,transparent_1px)]"
              style={{
                backgroundSize: `${100 / project.stageWidth}% ${100 / project.stageHeight}%`,
              }}
            />
            <span
              className="absolute top-1/2 left-1/2 block h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                backgroundColor: nextColor,
                boxShadow: `0 0 0 4px ${nextColor}40`,
              }}
            />
          </div>
          <p className="text-xs leading-relaxed text-zinc-400">
            追加すると、
            <span className="text-zinc-50">いま見ているシーンのステージ中央</span>
            に立ちます。そこからドラッグで動かしてください。
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={close}
            className="h-12 flex-1 rounded-[11px] border border-zinc-700 text-sm font-medium text-zinc-50"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={!selectedSceneId || isSubmitting || !name.trim()}
            className="h-12 flex-[2] rounded-[11px] bg-pink-500 text-[15px] font-semibold text-white disabled:opacity-50"
          >
            追加する
          </button>
        </div>
      </form>
    </BottomSheet>
  );
}
