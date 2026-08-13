"use client";

import { useViewerStore } from "@/features/viewer/store/useViewerStore";
import { themedDancerColor } from "@/features/dancer/lib/themedColor";
import { PressableButton } from "@/components/atoms/PressableButton";
import { formatMinutes } from "@/components/molecules/PlayheadClock";

/** ここでは押す的なので、エディタの26pxより大きい */
const MARKER_SIZE = 40;

/**
 * 開いた最初に「あなたはどれですか」を訊く画面。
 *
 * ■ なぜ最初に訊くのか
 * 選ぶまでこの画面の意味は半分しかない。「サビで自分はどこ」を
 * 見に来た人にとって、自分が誰か決まっていない隊形図は、
 * 貼り出された全体図と変わらない。あとから探させない。
 *
 * ■ 1シーン目の立ち位置を絵で出す
 * 名前を覚えていなくても、立ち位置なら分かることが多い。
 * 丸と名前チップの【どちらからでも】選べるようにしてある。
 */
export function ViewerEntry() {
  const project = useViewerStore((state) => state.project);
  const dancers = useViewerStore((state) => state.dancers);
  const scenes = useViewerStore((state) => state.scenes);
  const positionsBySceneId = useViewerStore(
    (state) => state.positionsBySceneId,
  );
  const focusedDancerId = useViewerStore((state) => state.focusedDancerId);
  const focusDancer = useViewerStore((state) => state.focusDancer);

  if (!project) return null;

  const firstScene = scenes[0];
  const positions = firstScene
    ? (positionsBySceneId[firstScene.id] ?? {})
    : {};
  const totalSeconds =
    scenes.length > 0 ? scenes[scenes.length - 1].timeSeconds : 0;
  const selected = dancers.find((dancer) => dancer.id === focusedDancerId);

  return (
    <div className="mx-auto flex h-dvh w-full max-w-md flex-col gap-4 overflow-y-auto px-5 pt-6 pb-[max(24px,env(safe-area-inset-bottom))]">
      <div>
        <p className="font-mono text-[10.5px] tracking-wide text-fg-muted">
          CHOREON · 見るだけ
        </p>
        <h1 className="mt-1 text-[22px] leading-tight font-semibold text-fg-strong">
          {project.title}
        </h1>
        <p className="mt-1 font-mono text-[11.5px] text-fg-muted">
          {scenes.length} シーン · {dancers.length} 人 ·{" "}
          {formatMinutes(totalSeconds)}
        </p>
      </div>

      <div>
        <h2 className="text-[15px] font-semibold text-fg-strong">
          あなたはどれですか
        </h2>
        <p className="mt-1 text-[12px] leading-[1.6] text-fg-sub">
          選ぶと、その人だけが濃く出て、道順も出るようになります。
          あとで変えられます。
        </p>
      </div>

      {/* 1シーン目の立ち位置。丸をそのまま押して選べる */}
      <div
        className="relative w-full overflow-hidden rounded-[calc(var(--radius)*1.2)] border border-line-strong bg-stage"
        style={{ aspectRatio: `${project.stageWidth} / ${project.stageHeight}` }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--stage-grid-soft)_1px,transparent_1px),linear-gradient(to_bottom,var(--stage-grid-soft)_1px,transparent_1px)]"
          style={{
            backgroundSize: `${100 / project.stageWidth}% ${100 / project.stageHeight}%`,
          }}
        />
        {dancers.map((dancer) => {
          const position = positions[dancer.id];
          if (!position) return null;
          const color = themedDancerColor(dancer.color);
          const isSelected = dancer.id === focusedDancerId;

          return (
            <PressableButton
              key={dancer.id}
              // 掴んで動かすものではないが、ステージの上のマーカーなので
              // 沈めずに持ち上げる(ダンサーのマーカーと同じ扱い)
              kind="lift"
              haptic
              // 名前チップと同じ読み上げにすると、2つ同じものが並ぶ。
              // どちらから選んでもよいが、何を押しているかは違う
              aria-label={`${dancer.name} の立ち位置`}
              aria-pressed={isSelected}
              onClick={() => focusDancer(dancer.id)}
              style={{
                left: `${(position.xCoordinate / project.stageWidth) * 100}%`,
                top: `${(position.yCoordinate / project.stageHeight) * 100}%`,
                width: MARKER_SIZE,
                height: MARKER_SIZE,
                background: color,
                transform: `translate(-50%, -50%) scale(${isSelected ? 1.08 : 1})`,
                boxShadow: isSelected
                  ? `0 0 0 5px color-mix(in oklab, ${color} 30%, transparent)`
                  : undefined,
              }}
              className="absolute rounded-full transition-transform duration-200 motion-reduce:transition-none"
            />
          );
        })}
      </div>

      {/* 名前からも選べる。立ち位置で分からない人のため */}
      <div className="flex flex-wrap gap-2">
        {dancers.map((dancer) => {
          const color = themedDancerColor(dancer.color);
          const isSelected = dancer.id === focusedDancerId;
          return (
            <PressableButton
              key={dancer.id}
              haptic
              onClick={() => focusDancer(dancer.id)}
              aria-pressed={isSelected}
              style={
                isSelected
                  ? {
                      borderColor: color,
                      background: `color-mix(in oklab, ${color} 14%, transparent)`,
                    }
                  : undefined
              }
              className={`flex h-10 items-center gap-2 rounded-[calc(var(--radius)*0.9167)] border px-[13px] text-[13px] ${
                isSelected
                  ? "font-semibold text-fg-strong"
                  : "border-line-strong text-fg-sub"
              }`}
            >
              <span
                aria-hidden
                style={{ background: color }}
                className="block h-[11px] w-[11px] shrink-0 rounded-full"
              />
              {dancer.name}
            </PressableButton>
          );
        })}
      </div>

      <div className="mt-auto flex flex-col gap-2 pt-4">
        <PressableButton
          kind="primary"
          disabled={!selected}
          onClick={() => selected && focusDancer(selected.id)}
          className="flex h-[50px] items-center justify-center rounded-[calc(var(--radius)*1.05)] bg-accent text-[15px] font-semibold text-accent-fg shadow-[inset_0_1px_0_rgb(255_255_255/.22)] disabled:opacity-40"
        >
          {selected ? `「${selected.name}」で見る` : "自分を選んでください"}
        </PressableButton>
        <PressableButton
          onClick={() => focusDancer(null)}
          className="flex h-11 items-center justify-center rounded-[calc(var(--radius)*0.9)] border border-line-strong text-[13px] text-fg-sub"
        >
          選ばずに全員を見る
        </PressableButton>
      </div>
    </div>
  );
}
