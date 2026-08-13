"use client";

import { useEffect, useState } from "react";
import { Pause, Play, Spline } from "lucide-react";
import { useViewerStore } from "@/features/viewer/store/useViewerStore";
import { ViewerEntry } from "@/components/organisms/ViewerEntry";
import { ViewerStage } from "@/components/organisms/ViewerStage";
import { ViewerScrub } from "@/components/organisms/ViewerScrub";
import { ViewerRoute } from "@/components/organisms/ViewerRoute";
import { ViewerMusic } from "@/components/organisms/ViewerMusic";
import { PressableButton } from "@/components/atoms/PressableButton";
import { useMusicStore } from "@/features/music/store/useMusicStore";
import { themedDancerColor } from "@/features/dancer/lib/themedColor";
import type { Dancer } from "@/features/dancer/types";
import type { Project } from "@/features/project/types";
import type { Position, Scene } from "@/features/scene/types";
import { useT } from "@/features/i18n/LocaleProvider";

type Props = {
  project: Project;
  dancers: Dancer[];
  scenes: Scene[];
  positions: Position[];
  /** ?p= で指定されたポジション。振付師が個別にリンクを配れる */
  requestedDancerId: string | null;
};

/**
 * 稽古場でダンサーが見る画面。編集の操作は一切出さない。
 *
 * ■ 出さないもの
 * ダンサーのドラッグ・回転ハンドル・シーンの追加/削除/並び替え・
 * テンプレート・インスペクター・履歴・シンメトリー・作品名の編集・保存。
 * 隠すのではなく【持っていない】 — ストアが編集のアクションを持たないので、
 * 支援技術から押せるボタンも、効くショートカットも存在しない。
 *
 * ■ 階層がエディタと逆
 * 主操作は再生ではなくスクラブ。知りたいのは特定の瞬間の立ち位置で、
 * それは指で止められる操作の方が速い。帯が画面幅いっぱいで、
 * 再生ボタンは36pxの枠線ボタンに格下げしてある。
 *
 * ■ 横持ちは2カラム
 * 稽古場では横に置いて見ることが多い。縦のままだとステージが潰れる。
 */
export function ViewerLayout({
  project,
  dancers,
  scenes,
  positions,
  requestedDancerId,
}: Props) {
  const t = useT();
  const hydrate = useViewerStore((state) => state.hydrate);
  const hasChosen = useViewerStore((state) => state.hasChosen);
  const focusedDancerId = useViewerStore((state) => state.focusedDancerId);
  const chooseAgain = useViewerStore((state) => state.chooseAgain);
  const isPathVisible = useViewerStore((state) => state.isPathVisible);
  const togglePath = useViewerStore((state) => state.togglePath);
  const currentSeconds = useViewerStore((state) => state.currentSeconds);
  const setCurrentSeconds = useViewerStore((state) => state.setCurrentSeconds);
  const [isPlaying, setIsPlaying] = useState(false);
  const hasMusic = useMusicStore((state) => state.objectUrl !== null);

  useEffect(() => {
    hydrate({ project, dancers, scenes, positions, requestedDancerId });
  }, [hydrate, project, dancers, scenes, positions, requestedDancerId]);

  const lastSeconds =
    scenes.length > 0 ? scenes[scenes.length - 1].timeSeconds : 0;

  // 通し再生。主役ではないので、時計は素朴な rAF で足りる。
  // ただし曲が入っているときは【曲が時計】になる(ViewerMusic)ので、
  // こちらは動かさない。2つの時計が同じ値を奪い合うと、再生位置が震える
  useEffect(() => {
    if (!isPlaying || hasMusic) return;

    let frame = 0;
    let previous = performance.now();
    const step = (now: number) => {
      frame = requestAnimationFrame(step);
      const elapsed = (now - previous) / 1000;
      previous = now;

      const next = useViewerStore.getState().currentSeconds + elapsed;
      if (next >= lastSeconds) {
        setCurrentSeconds(lastSeconds);
        setIsPlaying(false);
        return;
      }
      setCurrentSeconds(next);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [isPlaying, hasMusic, lastSeconds, setCurrentSeconds]);

  if (!hasChosen) return <ViewerEntry />;

  const dancer = dancers.find((item) => item.id === focusedDancerId);

  return (
    <div className="flex h-dvh flex-col overflow-clip pb-[max(24px,env(safe-area-inset-bottom))]">
      <header className="flex h-target-lg shrink-0 items-center gap-unit px-gutter">
        <span className="min-w-0 flex-1 truncate text-headline text-fg-strong">
          {project.title}
        </span>
        {/* 自分のポジション。押すと入口へ戻って選び直せる。
            ここで focusDancer(null) を呼ぶと「全員」に変わるだけで、
            入口には二度と戻れなくなる(端末の記憶を消すしかなくなる) */}
        <PressableButton
          onClick={chooseAgain}
          aria-label={t.viewer.route.reselect}
          className="flex h-8 shrink-0 items-center gap-unit rounded-full bg-surface-raised px-3 font-mono text-mono-m text-fg"
        >
          {dancer ? (
            <>
              <span
                aria-hidden
                style={{ background: themedDancerColor(dancer.color) }}
                className="block h-1.5 w-1.5 rounded-full"
              />
              {dancer.name}
            </>
          ) : (
            t.viewer.route.everyone
          )}
        </PressableButton>
      </header>

      {/* 横持ちと広い画面では、ステージの右に道順を置く */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 px-3.5 landscape:flex-row md:flex-row">
        {/* Stage は「親の高さいっぱいに伸びて、そこから幅を決める」作り。
            ここを items-center の横フレックスにすると、Stage が交差軸で
            伸びずに中身(ラベル)の高さまで縮み、盤面が高さ0になって
            【ステージが消える】。縦フレックスのまま渡す */}
        <div
          className="flex min-h-0 min-w-0 flex-1 flex-col"
          style={{ maxWidth: "min(100%, 640px)" }}
        >
          <ViewerStage />
        </div>

        <div className="flex shrink-0 flex-col gap-2 landscape:w-[300px] landscape:justify-center md:w-[320px] md:justify-center">
          <ViewerRoute />
        </div>
      </div>

      {/* 下の道具は1枚の板にまとめる。曲・スクラブ・再生が別々の面に
          散っていると、画面の下半分が細切れに見える */}
      <div className="shrink-0 px-gutter pt-unit">
        {/* 曲は共有されないので、見る人が自分の端末で選べるようにする。
            選ぶまでは帯の地が8カウントの縞になっている */}
        <ViewerMusic
          isPlaying={isPlaying}
          onEnded={() => setIsPlaying(false)}
        />

        <ViewerScrub />

        <div className="mt-unit flex items-center gap-unit">
          <PressableButton
            kind="icon"
            onClick={() => {
              if (currentSeconds >= lastSeconds) setCurrentSeconds(0);
              setIsPlaying((playing) => !playing);
            }}
            aria-label={isPlaying ? t.viewer.route.stop : t.viewer.route.play}
            /* 主役はスクラブなので、再生は静かなボタンに格下げしてある */
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-raised text-fg"
          >
            {isPlaying ? (
              <Pause size={16} fill="currentColor" />
            ) : (
              <Play size={16} fill="currentColor" />
            )}
          </PressableButton>

          {/* 導線だけは切れるようにする。隊形だけ見たいことがある。
              格子・顔被り・シンメトリーは、見る人には要らない */}
          {focusedDancerId && (
            <PressableButton
              role="switch"
              aria-checked={isPathVisible}
              onClick={togglePath}
              className={`flex h-8 shrink-0 items-center gap-1.5 rounded-2xl border px-[11px] text-label ${
                isPathVisible
                  ? "border-accent bg-accent/16 text-accent-soft"
                  : "border-line-strong text-fg-muted"
              }`}
            >
              <Spline size={13} />
              {t.viewer.route.paths}
            </PressableButton>
          )}
        </div>
      </div>
    </div>
  );
}
