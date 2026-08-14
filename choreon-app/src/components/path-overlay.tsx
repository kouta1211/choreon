import { View } from 'react-native';
import Svg, { Path, Polygon } from 'react-native-svg';

import { themedDancerColor } from '@/features/dancer/lib/themedColor';
import { toScreenY } from '@/features/canvas/lib/stageFlip';
import { useSettingsStore } from '@/features/settings/store/useSettingsStore';
import { useThemeStore } from '@/features/theme/store/useThemeStore';
import type { Dancer } from '@/features/dancer/types';
import type { Position } from '@/features/scene/types';

type Props = {
  /** 選択中シーンでの各ダンサーの位置 */
  currentPositions: Record<string, Position>;
  /** 次のシーンでの各ダンサーの位置。無ければ何も描かない */
  nextPositions: Record<string, Position>;
  dancers: Record<string, Dancer>;
  stageWidthUnits: number;
  stageHeightUnits: number;
};

/** 矢じりの大きさ（ステージを 0..100 に正規化した中での長さ） */
const ARROW_LENGTH = 3.5;
const ARROW_HALF_WIDTH = 2;

/**
 * 導線 — いまのシーンから次のシーンへ、誰がどこへ動くか。
 *
 * ダンサーごとの色の点線に矢じりを付ける。**複数人の線が交差する所**が
 * ぶつかりそうな所なので、それが目で拾えることが要点（Web版 PathOverlay と
 * 同じねらい）。
 *
 * ■ 0..100 に正規化して描く
 * SVG の座標系をステージの百分率にしておくと、ダンサーの `left%` /`top%` と
 * 同じ考え方で端点を置ける。ステージの縦横比は既に合わせてあるので、
 * 引き伸ばしても形は崩れない。
 *
 * ■ 矢じりは自前の三角形
 * SVG の `marker` は環境によって扱いが違う。線の向きから角度を出して
 * 三角形を1つ置く方が、Web・iOS・Android で同じに出る。
 *
 * ■ 曲線は描くが、まだ**曲げられない**
 * Web版は制御点を掴んで曲線に編集できる。ここでは Web版で付けた曲線を
 * そのまま描くだけ（同じ二次ベジェの式なので、線と実際の動きは一致する）。
 * 曲げる操作はハンドルの当たり判定を作るところからなので、次の一手。
 */
export function PathOverlay({
  currentPositions,
  nextPositions,
  dancers,
  stageWidthUnits,
  stageHeightUnits,
}: Props) {
  const isAudienceOnTop = useSettingsStore((state) => state.isAudienceOnTop);
  const theme = useThemeStore((state) => state.preference.theme);
  const screenY = (value: number) => toScreenY(value, stageHeightUnits, isAudienceOnTop);

  const toX = (units: number) => (units / stageWidthUnits) * 100;
  const toY = (units: number) => (screenY(units) / stageHeightUnits) * 100;

  const segments = Object.entries(currentPositions).flatMap(([id, from]) => {
    const to = nextPositions[id];
    if (!to) return [];
    // 動かない人の線は描かない（点だけが残って、読みづらくなる）
    if (from.xCoordinate === to.xCoordinate && from.yCoordinate === to.yCoordinate) {
      return [];
    }

    const hasCurve = to.curveControlX != null && to.curveControlY != null;
    const x1 = toX(from.xCoordinate);
    const y1 = toY(from.yCoordinate);
    const x2 = toX(to.xCoordinate);
    const y2 = toY(to.yCoordinate);
    const cx = hasCurve ? toX(to.curveControlX as number) : (x1 + x2) / 2;
    const cy = hasCurve ? toY(to.curveControlY as number) : (y1 + y2) / 2;

    // 矢じりの向きは【終点の直前の接線】。二次ベジェの終点での接線は
    // 「制御点 → 終点」の向きなので、直線のときも同じ式で足りる
    const angle = Math.atan2(y2 - cy, x2 - cx);

    return [
      {
        id,
        color: themedDancerColor(dancers[id]?.color ?? '', theme),
        d: `M${x1},${y1} Q${cx},${cy} ${x2},${y2}`,
        arrow: arrowPoints(x2, y2, angle),
      },
    ];
  });

  if (segments.length === 0) return null;

  return (
    <View pointerEvents="none" className="absolute inset-0">
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        {segments.map((segment) => (
          <Path
            key={segment.id}
            d={segment.d}
            fill="none"
            stroke={segment.color}
            strokeWidth={0.6}
            strokeDasharray="2 1.5"
            strokeLinecap="round"
          />
        ))}
        {segments.map((segment) => (
          <Polygon key={`${segment.id}-arrow`} points={segment.arrow} fill={segment.color} />
        ))}
      </Svg>
    </View>
  );
}

/** 終点に置く三角形の3点。線の向き(angle)に合わせて回す */
function arrowPoints(x: number, y: number, angle: number): string {
  const tip = { x, y };
  const back = {
    x: x - Math.cos(angle) * ARROW_LENGTH,
    y: y - Math.sin(angle) * ARROW_LENGTH,
  };
  const left = {
    x: back.x + Math.cos(angle + Math.PI / 2) * ARROW_HALF_WIDTH,
    y: back.y + Math.sin(angle + Math.PI / 2) * ARROW_HALF_WIDTH,
  };
  const right = {
    x: back.x + Math.cos(angle - Math.PI / 2) * ARROW_HALF_WIDTH,
    y: back.y + Math.sin(angle - Math.PI / 2) * ARROW_HALF_WIDTH,
  };
  return `${tip.x},${tip.y} ${left.x},${left.y} ${right.x},${right.y}`;
}
