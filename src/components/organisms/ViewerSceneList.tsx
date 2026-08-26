"use client";

import { useState } from "react";
import { ListOrdered } from "lucide-react";
import { PressableButton } from "@/components/atoms/PressableButton";
import {
  Dialog,
  DialogDrawer,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useViewerStore } from "@/features/viewer/store/useViewerStore";
import { countLabelAtBeat } from "@/features/music/lib/counts";
import { useT } from "@/features/i18n/LocaleProvider";

/**
 * 右から出てくるシーン一覧（実機の要望 2026-08-19）。
 *
 * ■ なぜ要るのか
 * 見る画面を1画面に収めたので、下の帯は「いまの前後」しか見えない。
 * 20シーンある作品で「7番目の頭から確かめたい」ときに、払って探すのは遅い。
 * 一覧から直接飛べる道を1本足す。
 *
 * ■ 1画面に収めない
 * 並ぶ数は作品のシーン数で決まる。収めようとすると1行が潰れて読めなくなる
 * ので、**この板の中だけ縦に流す**（user の指定）。
 *
 * ■ 出すのは番号・名前・（曲があれば）時刻
 * ミニチュアの図は出さない。描く分だけ重くなるうえ、探すのに使うのは
 * 「何番目か」と「何秒か」で、図はステージを見れば分かる。
 */
export function ViewerSceneList() {
  const t = useT();
  const [isOpen, setOpen] = useState(false);
  const scenes = useViewerStore((state) => state.scenes);
  const currentSeconds = useViewerStore((state) => state.currentSeconds);
  /* 飛ぶときは再生を止める（帯と同じ作法） */
  const jumpToSeconds = useViewerStore((state) => state.jumpToSeconds);

  if (scenes.length === 0) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <PressableButton
        kind="icon"
        onClick={() => setOpen(true)}
        aria-label={t.viewer.route.sceneListOpen}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-raised text-fg-sub"
      >
        <ListOrdered size={16} />
      </PressableButton>

      <DialogDrawer aria-describedby={undefined}>
        <div className="shrink-0 px-gutter pt-gutter-lg pb-unit">
          <DialogTitle className="text-headline text-fg-strong">
            {t.viewer.route.sceneListTitle}
          </DialogTitle>
          <DialogDescription className="mt-1 text-caption text-fg-muted">
            {t.viewer.route.sceneListNote}
          </DialogDescription>
        </div>

        {/* 長さはシーンの数で決まる。ここだけ流す */}
        <ul className="min-h-0 flex-1 overflow-y-auto px-gutter pb-[max(16px,env(safe-area-inset-bottom))]">
          {scenes.map((scene, index) => {
            const isHere =
              currentSeconds >= scene.timeSeconds &&
              (scenes[index + 1]?.timeSeconds ?? Infinity) > currentSeconds;

            return (
              <li key={scene.id}>
                <PressableButton
                  onClick={() => {
                    jumpToSeconds(scene.timeSeconds);
                    setOpen(false);
                  }}
                  aria-current={isHere ? "true" : undefined}
                  className={`flex h-target w-full items-center gap-unit rounded-lg px-2 text-left ${
                    isHere ? "bg-accent/14 text-fg-strong" : "text-fg-sub"
                  }`}
                >
                  <span className="w-6 shrink-0 font-mono text-mono-s text-fg-muted">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-label">
                    {scene.name}
                  </span>
                  <span className="shrink-0 font-mono text-mono-s text-fg-muted">
                    {countLabelAtBeat(scene.positionBeats)}
                  </span>
                </PressableButton>
              </li>
            );
          })}
        </ul>
      </DialogDrawer>
    </Dialog>
  );
}
