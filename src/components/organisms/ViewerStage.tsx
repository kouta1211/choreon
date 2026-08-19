"use client";

import { Stage } from "@/components/organisms/Stage";
import { StageMarks } from "@/components/molecules/StageMarks";
import { useViewerStore } from "@/features/viewer/store/useViewerStore";
import {
  positionsAtSeconds,
  sceneSpanAt,
} from "@/features/viewer/lib/interpolate";
import { useSettingsStore } from "@/features/settings/store/useSettingsStore";
import { mirrorAngle, toScreenY } from "@/features/canvas/lib/stageFlip";
import { DancerMarker } from "@/components/molecules/DancerIcon";
import { PathOverlay } from "@/components/molecules/PathOverlay";
import { useStageZoom } from "@/features/viewer/hooks/useStageZoom";

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
 * ■ 導線は【これからどこへ動くか】。描くのは作る画面と同じ部品
 * いまの位置から、次のシーンの位置へ（実機の報告 2026-08-19）。
 * 線の引き方は `PathOverlay` にそのまま任せる — 見た目を作り直すと
 * 作る画面と少しずつずれていく（点線の刻み・矢印・曲線の扱い）。
 * **渡すのを自分のぶんだけに絞れば、1本だけ描かれる**。
 * 他人の導線は出さない — 6本引くと自分の1本が埋もれる。
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
  /* 分けて受けるのは、ref を素の束縛にするため。
     オブジェクト越しに触ると react-hooks/refs が「描画中に ref を読んだ」
     と見なす（実際に読んでいるのは描画の外だが、静的には区別できない） */
  const {
    boxRef: zoomBoxRef,
    scale: zoomScale,
    offset: zoomOffset,
    isGesturing: isZoomGesturing,
    handlers: zoomHandlers,
  } = useStageZoom();

  if (!project) return null;

  const positions = positionsAtSeconds(
    scenes,
    positionsBySceneId,
    currentSeconds,
  );
  const dancerById = new Map(dancers.map((dancer) => [dancer.id, dancer]));

  const span = sceneSpanAt(scenes, currentSeconds);
  const own = positions.find((p) => p.dancerId === focusedDancerId);

  /* 自分の導線1本ぶん。始点は【いまの位置】なので、再生中は線が縮んで
     残りの道のりを指し続ける。最後のシーンには行き先が無いので出さない。
     PathOverlay は「動かない人には線を引かない」ので、その場に留まる
     シーンでも余計な線は出ない */
  const goingTo =
    own && span?.to
      ? positionsBySceneId[span.to.id]?.[own.dancerId]
      : undefined;
  const ownPath =
    own && span && goingTo
      ? {
          dancerId: own.dancerId,
          from: {
            sceneId: span.from.id,
            dancerId: own.dancerId,
            xCoordinate: own.x,
            yCoordinate: own.y,
            rotationAngle: own.rotationAngle,
          },
          to: goingTo,
        }
      : null;
  // 見る側の端末でも「客席を上にする」は効く。踊る人が稽古場で鏡を
  // 見ながら確かめるための設定なので、見る画面でこそ要る(stageFlip.ts)
  const screenY = (value: number) =>
    toScreenY(value, project.stageHeight, isAudienceOnTop);

  return (
    /* 2本指で拡げて見られるようにする（実機の要望 2026-08-19）。
       20人の作品をスマホで見ると丸が指より小さいので、自分の周りだけ
       大きくして「誰と誰の間か」を確かめたい、という用途。

       包むのはステージ【ごと】。中のダンサーだけ拡げると、床の格子と
       ずれて「どこに立っているのか」が読めなくなる。
       はみ出しは切る — 下の道順や帯へ被せない */
    <div
      ref={zoomBoxRef}
      data-testid="viewer-zoom"
      {...zoomHandlers}
      className="relative flex min-h-0 flex-1 touch-none overflow-hidden"
    >
      <div
        className={`flex min-h-0 flex-1 flex-col ${
          isZoomGesturing ? "" : "transition-transform duration-150"
        }`}
        style={{
          transform: `translate(${zoomOffset.x}px, ${zoomOffset.y}px) scale(${zoomScale})`,
        }}
      >
        <Stage
          widthUnits={project.stageWidth}
          heightUnits={project.stageHeight}
        >
          <StageMarks
            stageWidthUnits={project.stageWidth}
            stageHeightUnits={project.stageHeight}
          />

          {/* これからどこへ動くか。作る画面と同じ部品で描く */}
          {isPathVisible && ownPath && (
            <PathOverlay
              currentPositions={{ [ownPath.dancerId]: ownPath.from }}
              nextPositions={{ [ownPath.dancerId]: ownPath.to }}
              dancers={Object.fromEntries(
                dancers.map((dancer) => [dancer.id, dancer]),
              )}
              stageWidthUnits={project.stageWidth}
              stageHeightUnits={project.stageHeight}
            />
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
                {/* 名前はここでは出さない（実機の報告 06-11）。
                マーカー自身が頭の中に頭文字を描いていて、その下へ名前を
                重ねると**同じ数字が2つ**並んで重なった。
                誰が自分かは「濃い1人」と、上のヘッダーの名札で分かる */}
              </div>
            );
          })}
        </Stage>
      </div>
    </div>
  );
}
