"use client";

import { Stage } from "@/components/organisms/Stage";
import { StageMarks } from "@/components/molecules/StageMarks";
import { themedDancerColor } from "@/features/dancer/lib/themedColor";
import { useViewerStore } from "@/features/viewer/store/useViewerStore";
import {
  positionsAtSeconds,
  sceneSpanAt,
} from "@/features/viewer/lib/interpolate";
import { useSettingsStore } from "@/features/settings/store/useSettingsStore";
import { mirrorAngle, toScreenY } from "@/features/canvas/lib/stageFlip";
import { DancerMarker } from "@/components/molecules/DancerIcon";

/* 自分を一回り大きくするのは DancerMarker が isFocused で行う。
   ここで重ねて掛けると二重になる */
/** 選んでいる人が居るとき、他の人をどれだけ薄くするか */
const OTHER_OPACITY = 0.45;

/**
 * ビューアのステージ。編集の操作は一切出さない。
 *
 * ■ 自分以外は【塗りをやめて輪郭だけ】にする
 * 塗ったまま透明度を落とすやり方だと、「薄い誰か」が6人並ぶだけで
 * 結局どれが自分か読めない。塗り→輪郭という【描き方そのものの変換】が
 * 効いていて、塗られているものが1つしかない画面になる。
 *
 * ■ 直前の位置を破線で残す
 * 「どこから来たか」が分かると、いま画面に出ている位置が通過点なのか
 * 到着点なのか判断できる。他人の導線は出さない — 6本引くと、
 * 自分の1本が埋もれる。
 */
export function ViewerStage() {
  const project = useViewerStore((state) => state.project);
  const dancers = useViewerStore((state) => state.dancers);
  const scenes = useViewerStore((state) => state.scenes);
  const positionsBySceneId = useViewerStore(
    (state) => state.positionsBySceneId,
  );
  const focusedDancerId = useViewerStore((state) => state.focusedDancerId);
  const currentSeconds = useViewerStore((state) => state.currentSeconds);
  const isPathVisible = useViewerStore((state) => state.isPathVisible);
  const isAudienceOnTop = useSettingsStore((state) => state.isAudienceOnTop);

  if (!project) return null;

  const positions = positionsAtSeconds(
    scenes,
    positionsBySceneId,
    currentSeconds,
  );
  const dancerById = new Map(dancers.map((dancer) => [dancer.id, dancer]));

  // 自分が「どこから来たか」。区間の始まりの位置
  const span = sceneSpanAt(scenes, currentSeconds);
  const cameFrom =
    focusedDancerId && span
      ? positionsBySceneId[span.from.id]?.[focusedDancerId]
      : undefined;
  const own = positions.find((p) => p.dancerId === focusedDancerId);
  // 見る側の端末でも「客席を上にする」は効く。踊る人が稽古場で鏡を
  // 見ながら確かめるための設定なので、見る画面でこそ要る(stageFlip.ts)
  const screenY = (value: number) =>
    toScreenY(value, project.stageHeight, isAudienceOnTop);

  return (
    <Stage widthUnits={project.stageWidth} heightUnits={project.stageHeight}>
      <StageMarks
        stageWidthUnits={project.stageWidth}
        stageHeightUnits={project.stageHeight}
      />

      {/* どこから来たか。破線の丸と、そこからの線 */}
      {isPathVisible && own && cameFrom && (
        <svg
          aria-hidden
          viewBox={`0 0 ${project.stageWidth} ${project.stageHeight}`}
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full"
        >
          <line
            x1={cameFrom.xCoordinate}
            y1={screenY(cameFrom.yCoordinate)}
            x2={own.x}
            y2={screenY(own.y)}
            stroke={themedDancerColor(
              dancerById.get(own.dancerId)?.color ?? "#888",
            )}
            strokeWidth={0.06}
            vectorEffect="non-scaling-stroke"
            style={{ strokeWidth: 2 }}
          />
          <circle
            cx={cameFrom.xCoordinate}
            cy={screenY(cameFrom.yCoordinate)}
            r={0.36}
            fill="none"
            stroke={themedDancerColor(
              dancerById.get(own.dancerId)?.color ?? "#888",
            )}
            strokeDasharray="0.24 0.2"
            style={{ strokeWidth: 1.5 }}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}

      {positions.map((position) => {
        const dancer = dancerById.get(position.dancerId);
        if (!dancer) return null;

        const isOwn = dancer.id === focusedDancerId;
        // 誰も選んでいないときは全員そのまま(エディタと同じ見た目で、
        // 編集の操作だけが無い状態)
        const isFilled = isOwn || focusedDancerId === null;
        /* 上下を鏡にしているときは、鼻先も鏡にする。写さないと
           「見えている向きと逆を向く」— 作る側(DraggableDancerIcon)と同じ */
        const screenRotation = isAudienceOnTop
          ? mirrorAngle(position.rotationAngle)
          : position.rotationAngle;

        return (
          /* 大きさを持たない点として置く。マーカー自身が -50% で
             真ん中に来るので、ここで transform を掛けない
             (掛けると二重にずれる。作る側の置き方と同じ) */
          <div
            key={dancer.id}
            className="pointer-events-none absolute"
            style={{
              left: `${(position.x / project.stageWidth) * 100}%`,
              top: `${(screenY(position.y) / project.stageHeight) * 100}%`,
              opacity: isFilled ? 1 : OTHER_OPACITY,
            }}
          >
            {/* 実物のマーカー(頭＋鼻先)。丸だけだと向きが分からない
                — 見る人にとっては「どっちを向くか」も振付の一部
                (実機の報告 2026-08-19) */}
            <DancerMarker
              dancer={dancer}
              rotationAngle={screenRotation}
              isFocused={isOwn}
            />
            {isOwn && (
              <span className="absolute top-0 left-1/2 mt-6 -translate-x-1/2 rounded px-1 text-caption font-semibold whitespace-nowrap text-fg-strong [text-shadow:var(--label-shadow)]">
                {dancer.name}
              </span>
            )}
          </div>
        );
      })}
    </Stage>
  );
}
