import { motion } from "motion/react";
import { DancerNameLabel } from "@/components/atoms/DancerNameLabel";
import { shouldPlaceNameAbove } from "@/features/dancer/lib/nameLabel";
import { toScreenY } from "@/features/canvas/lib/stageFlip";
import { useDancerMotion } from "@/features/canvas/hooks/useDancerMotion";

export type OverlayName = {
  id: string;
  name: string;
  /** 行き先のステージ座標。**Y が大きいほど客席側**（描くときに鏡にする） */
  xCoordinate: number;
  yCoordinate: number;
  /** 曲線の制御点（ステージ座標）。直線なら null */
  curveControlX: number | null;
  curveControlY: number | null;
  /** 動き出すまで止まっている秒数 */
  holdSeconds: number;
  /** 動くのにかける秒数 */
  moveSeconds: number;
};

type Props = {
  names: OverlayName[];
  stageWidthUnits: number;
  stageHeightUnits: number;
  isAudienceOnTop: boolean;
};

/**
 * ダンサーの名前だけを、**丸より上の層**へまとめて描く。
 *
 * ■ なぜ別の層なのか（実機の報告 2026-08-31「名前とアイコンが被っていたら
 *   名前を優先して」）
 * 名前はもともとダンサー1人ずつの中に描いていた。ところがダンサーは
 * motion が transform を当てるので **1人ずつが独立した重なりの単位**
 * (stacking context) になり、**中の z-index をいくら上げても隣の人の丸を
 * 越えられない**。近くに立っている人の丸が、名前を隠していた。
 *
 * ここは丸を全部描いたあとの**兄弟**なので、名前が必ず上に出る。
 *
 * ■ 動きは丸と同じ仕組みを通す
 * ⚠️ **位置を CSS で直に置くと、名前だけが行き先へ飛ぶ**
 * （2026-08-31 の報告「名前がついていっていない」）。丸は
 * `useDancerMotion` が滑らかに動かしているので、名前も**同じフックを
 * 同じ引数で**通す。式を写すのではなく、動かし手ごと共有する。
 *
 * ■ 掴んで動いている人は、ここには居ない
 * その人の名前はダンサーの中が描く（掴んだ人には z-10 が付くので上に出る）。
 * **どちらが描くかの判断は DancerLayer が1箇所で持つ** — 2箇所で別々に
 * 決めると、食い違ったときに**名前がどこにも出ない**。
 *
 * ■ 押せない
 * 丸の当たり判定を奪わないよう pointer-events を切ってある。
 */
export function DancerNamesOverlay({
  names,
  stageWidthUnits,
  stageHeightUnits,
  isAudienceOnTop,
}: Props) {
  if (names.length === 0) return null;

  return (
    <div
      aria-hidden
      data-testid="dancer-names-overlay"
      className="pointer-events-none absolute inset-0"
    >
      {names.map((entry) => (
        <OverlayNameItem
          key={entry.id}
          entry={entry}
          stageWidthUnits={stageWidthUnits}
          stageHeightUnits={stageHeightUnits}
          isAudienceOnTop={isAudienceOnTop}
        />
      ))}
    </div>
  );
}

/** 名前1つ。丸と同じ動かし手(useDancerMotion)を持つのでフックが要る */
function OverlayNameItem({
  entry,
  stageWidthUnits,
  stageHeightUnits,
  isAudienceOnTop,
}: {
  entry: OverlayName;
  stageWidthUnits: number;
  stageHeightUnits: number;
  isAudienceOnTop: boolean;
}) {
  // 画面の上下は設定で入れ替わる。丸と同じ変換を通す
  const screenY = toScreenY(
    entry.yCoordinate,
    stageHeightUnits,
    isAudienceOnTop,
  );
  const hasCurve = entry.curveControlX !== null && entry.curveControlY !== null;

  const { left, top } = useDancerMotion({
    leftPercent: (entry.xCoordinate / stageWidthUnits) * 100,
    topPercent: (screenY / stageHeightUnits) * 100,
    controlLeftPercent: hasCurve
      ? (entry.curveControlX! / stageWidthUnits) * 100
      : null,
    controlTopPercent: hasCurve
      ? (toScreenY(entry.curveControlY!, stageHeightUnits, isAudienceOnTop) /
          stageHeightUnits) *
        100
      : null,
    // ここに居るのは止まっている人だけ（掴んでいる人はダンサーの中が描く）
    isDragging: false,
    isFollowingGroup: false,
    transitionDurationSeconds: entry.moveSeconds,
    holdSeconds: entry.holdSeconds,
    // 名前は薄くしない。薄くするのは丸の側の強調表示の話
    dimmedOpacity: 1,
  });

  return (
    <motion.div className="absolute" style={{ left, top }}>
      <DancerNameLabel
        name={entry.name}
        above={shouldPlaceNameAbove(screenY, stageHeightUnits)}
      />
    </motion.div>
  );
}
