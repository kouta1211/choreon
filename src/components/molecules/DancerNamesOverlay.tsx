import { DancerNameLabel } from "@/components/atoms/DancerNameLabel";
import { shouldPlaceNameAbove } from "@/features/dancer/lib/nameLabel";
import { toScreenY } from "@/features/canvas/lib/stageFlip";

export type OverlayName = {
  id: string;
  name: string;
  /** ステージ座標。**Y が大きいほど客席側**（画面へ出すときに鏡にする） */
  xCoordinate: number;
  yCoordinate: number;
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
 * ここは丸を全部描いたあとに置く**兄弟**なので、名前が必ず上に出る。
 *
 * ■ 掴んでいる最中の人は、ここには居ない
 * 動いている人の名前は、これまでどおりダンサーの中が描く（掴んだ人には
 * z-10 が付くので、そちらでも上に出る）。**動いている間だけ transform の
 * 書き手を入れ替える、という形にしない**ため — 一度でも書き手が
 * 入れ替わると、motion が値を塗り戻して動かなくなる（2026-08-25 に
 * ドラッグ追従で踏んだのと同じ形）。振り分けは DancerLayer が持つ。
 *
 * ■ 押せない
 * 丸の当たり判定を奪わないよう pointer-events を切ってある。
 * 名前は読むものであって、掴むものではない。
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
      {names.map((entry) => {
        // 画面の上下は設定で入れ替わる。丸と同じ変換を通す
        const screenY = toScreenY(
          entry.yCoordinate,
          stageHeightUnits,
          isAudienceOnTop,
        );
        return (
          <div
            key={entry.id}
            className="absolute"
            style={{
              left: `${(entry.xCoordinate / stageWidthUnits) * 100}%`,
              top: `${(screenY / stageHeightUnits) * 100}%`,
            }}
          >
            <DancerNameLabel
              name={entry.name}
              above={shouldPlaceNameAbove(screenY, stageHeightUnits)}
            />
          </div>
        );
      })}
    </div>
  );
}
