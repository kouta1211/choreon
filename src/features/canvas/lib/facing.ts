import type { Position } from "@/features/scene/types";
import type { PositionChange } from "@/features/canvas/store/useHistoryStore";
import { ROTATION_SNAP_STEP_DEGREES } from "@/features/canvas/lib/dragMath";
import { mirrorAngle } from "@/features/canvas/lib/stageFlip";

/**
 * 右クリックのメニューに出す「向きの升」(3×3 の方向パッド)の計算。
 *
 * ■ なぜ回転のつまみと別に要るのか
 * つまみ(RotationHandle)は**1人選んでいるときしか出ない**。まとめて選んだ
 * 何人かを一斉に同じ向きへ揃える道が無かった。升なら、選んだ全員へ
 * 同じ角度を配れる。
 *
 * ■ 角度の規約は変えない
 * 0度＝客席側＝画面の下、時計回りに増える(DancerMarker / RotationHandle と
 * 同じ)。刻みもつまみの自動補間(snapRotation)と同じ 45度で、定数を読む。
 *
 * ■ 升の位置は【画面の向き】、保存するのは【ステージの向き】
 * パッドは画面の絵なので、押した升と鼻先の向きが一致していなければ
 * 意味が反転する。「客席を上にする」を入れると上下が鏡になるので、
 * 押された画面の向きを toStageFacing でステージの向きへ写してから保存する。
 * 札(読み上げ名)は写した後の【ステージの意味】から引くので、
 * 「客席を向く」の升は、反転すると上へ移る。
 *
 * ここは marquee.ts と同じ壊れ方(左右は合っているのに前後だけ逆)をする
 * 場所なので、両方の向きをテストで固定してある。
 */

/** 3×3 のどの升か。CSS Grid の行/列(1始まり)にそのまま渡せる形にしてある */
export type FacingCell = {
  /** 1が画面の上、3が画面の下 */
  row: 1 | 2 | 3;
  /** 1が画面の左、3が画面の右 */
  column: 1 | 2 | 3;
};

/** 向きの札のキー。左右は【客席から見て】。i18n の editor.contextMenu.facing に対応する */
export type FacingLabelKey =
  | "front"
  | "frontLeft"
  | "left"
  | "backLeft"
  | "back"
  | "backRight"
  | "right"
  | "frontRight";

export type FacingDirection = {
  /** 画面の向き(度)。0が画面の下 */
  screenAngle: number;
  cell: FacingCell;
};

/** 0〜359度に丸めた角度 */
export function normalizeAngle(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

/**
 * その角度が画面のどちらを指しているか(単位ベクトル)。
 * 0度で真下(0, 1)、時計回りに回る。
 */
function screenVector(angle: number): { dx: number; dy: number } {
  const radians = (angle * Math.PI) / 180;
  return { dx: -Math.sin(radians), dy: Math.cos(radians) };
}

/**
 * 画面の向きから、3×3 のどの升かを求める。
 *
 * 中央(2,2)が本人なので、指している向きの単位ベクトルを丸めて足すだけで
 * 升が決まる。45度刻みだから、丸めた成分は必ず -1 / 0 / 1 のどれかになる。
 */
export function cellForScreenAngle(screenAngle: number): FacingCell {
  const { dx, dy } = screenVector(normalizeAngle(screenAngle));
  return {
    row: (2 + Math.round(dy)) as FacingCell["row"],
    column: (2 + Math.round(dx)) as FacingCell["column"],
  };
}

/**
 * 升に並べる向きの一覧。0度(画面の下)から時計回り。
 *
 * 刻みは回転のつまみと同じ定数から作る。3×3 の升に収まるのは
 * 45度刻み(8方向)のときだけなので、そこはテストで固定してある。
 */
export const FACING_DIRECTIONS: FacingDirection[] = Array.from(
  { length: Math.round(360 / ROTATION_SNAP_STEP_DEGREES) },
  (_, index) => {
    const screenAngle = index * ROTATION_SNAP_STEP_DEGREES;
    return { screenAngle, cell: cellForScreenAngle(screenAngle) };
  },
);

/**
 * 押された升(画面の向き)を、保存するステージの向きへ写す。
 *
 * 上下の鏡は自分自身が逆写像なので、逆向き(ステージ→画面)にも同じ関数を使える。
 */
export function toStageFacing(
  screenAngle: number,
  isAudienceOnTop: boolean,
): number {
  const normalized = normalizeAngle(screenAngle);
  return isAudienceOnTop ? mirrorAngle(normalized) : normalized;
}

/** ステージの向きに対する札のキー。左右は客席から見た向き */
const LABEL_KEY_BY_STAGE_ANGLE: Record<number, FacingLabelKey> = {
  0: "front",
  45: "frontLeft",
  90: "left",
  135: "backLeft",
  180: "back",
  225: "backRight",
  270: "right",
  315: "frontRight",
};

/**
 * ステージの向きの札。刻みに乗っていない角度(つまみで細かく回したもの)は
 * 升のどれでもないので null を返す。
 */
export function facingLabelKey(stageAngle: number): FacingLabelKey | null {
  return LABEL_KEY_BY_STAGE_ANGLE[normalizeAngle(stageAngle)] ?? null;
}

/**
 * 選んだ人たちが**全員同じ向き**ならその角度、ばらばらなら null。
 *
 * 升に「いまここ」の印を付けるために使う。1人も居なければ印は付けない。
 */
export function sharedFacing(angles: number[]): number | null {
  if (angles.length === 0) return null;
  const first = normalizeAngle(angles[0]);
  return angles.every((angle) => normalizeAngle(angle) === first)
    ? first
    : null;
}

/**
 * 升を描く順（画面の左上から右下へ）。
 *
 * メニューの矢印キーは**DOM の並び**を辿るので、目で見た並びと一致させる。
 * 角度の順（下→左下→左…）のまま並べると、下キーで飛ぶ先が読めない。
 */
export const FACING_DIRECTIONS_IN_READING_ORDER: FacingDirection[] = [
  ...FACING_DIRECTIONS,
].sort((a, b) => a.cell.row - b.cell.row || a.cell.column - b.cell.column);

/**
 * 選んだ人たちを同じ向きへ揃えるときの、変更の一覧。
 *
 * **既にその向きの人は入れない。** 入れると「何も変わらない1手」が履歴に
 * 積まれて、元に戻すを押しても見た目が動かない回が混ざる。
 *
 * 立ち位置を持たない人（そのシーンに居ない人）も飛ばす。
 */
export function facingChanges({
  sceneId,
  dancerIds,
  positions,
  rotationAngle,
}: {
  sceneId: string;
  dancerIds: string[];
  positions: Record<string, Position>;
  rotationAngle: number;
}): PositionChange[] {
  return dancerIds.flatMap((dancerId) => {
    const before = positions[dancerId];
    if (!before || before.rotationAngle === rotationAngle) return [];
    return [
      {
        sceneId,
        dancerId,
        before,
        after: { ...before, rotationAngle },
      },
    ];
  });
}
