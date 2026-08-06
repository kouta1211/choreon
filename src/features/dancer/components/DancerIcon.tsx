import type { Dancer } from "@/features/dancer/types";

type Props = {
  dancer: Dancer;
  /** ステージ座標系での位置(0..stageWidthUnits / 0..stageHeightUnits) */
  x: number;
  y: number;
  /** 向き(度)。0度 = ステージ上方向(客席から見て奥)を向く */
  rotationAngle: number;
  stageWidthUnits: number;
  stageHeightUnits: number;
};

/** 円+向き三角形の見た目部分だけを描画する。配置(絶対位置・ドラッグtransform)は
 * 呼び出し側の責務にすることで、DancerIcon(静止表示)とDraggableDancerIcon
 * (ドラッグ表示)の両方から同じ見た目を再利用できるようにしている */
export function DancerMarker({
  dancer,
  rotationAngle,
}: {
  dancer: Dancer;
  rotationAngle: number;
}) {
  return (
    <>
      {/* 向き表示: 円の中心から見た角度分だけ回転させた三角形を、円の外側に配置する */}
      <div
        aria-hidden
        className="absolute left-0 top-0 h-0 w-0 border-x-4 border-b-8 border-x-transparent"
        style={{
          borderBottomColor: dancer.color,
          transform: `translate(-50%, -50%) rotate(${rotationAngle}deg) translateY(-18px)`,
        }}
      />
      <div
        className="flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-xs font-bold text-white"
        style={{ backgroundColor: dancer.color }}
      >
        {dancer.name.slice(0, 1)}
      </div>
    </>
  );
}

export function DancerIcon({
  dancer,
  x,
  y,
  rotationAngle,
  stageWidthUnits,
  stageHeightUnits,
}: Props) {
  const leftPercent = (x / stageWidthUnits) * 100;
  const topPercent = (y / stageHeightUnits) * 100;

  return (
    <div
      data-testid="dancer-icon"
      className="absolute"
      style={{ left: `${leftPercent}%`, top: `${topPercent}%` }}
    >
      <DancerMarker dancer={dancer} rotationAngle={rotationAngle} />
    </div>
  );
}
