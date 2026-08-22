import { MARKER_SIZE } from "@/features/dancer/constants";

/** ダンサーIDごとのPositionを引くセレクタの「シーンが無い/未該当」フォールバック値。
 * セレクタ内で `?? {}` すると呼び出すたびに新しいオブジェクト参照を返してしまい、
 * Zustandが「状態が変わった」と誤検知して無限に再レンダーし続ける
 * (Maximum update depth exceeded)。フォールバック値はモジュールレベルの
 * 固定参照にしておくことでこれを避ける */
export const EMPTY_POSITIONS = {};

/**
 * シーン切り替え時の移動アニメーションのイージング。
 *
 * ダンサー本体(DraggableDancerIcon)と、導線が進んだぶんだけ消えていく演出
 * (PathTrail)は別々にアニメーションを走らせている。両者が同じ時間・同じ
 * イージングで動いて初めて「線を食べながら進んでいる」ように見えるため、
 * ここで一箇所に持って共有する(片方だけ変えられないようにする)。
 */
export const SCENE_TRANSITION_EASE = "easeOut";

/** 遷移時間が設定されていない場合に使う秒数 */
export const DEFAULT_TRANSITION_DURATION_SECONDS = 0.3;

/**
 * シーンが切り替わった瞬間に【入れ替わる】重ね物を馴染ませる秒数。
 *
 * ダンサー本体は前の位置から次の位置へ補間して動くのでカットが無いが、
 * 導線や警告はシーンが変わった時点で別のものにパッと差し替わる。
 * ステージの上で動いているものと止まったまま入れ替わるものが混ざると、
 * 後者だけが目に付いて「点滅した」ように見える。
 *
 * ダンサーの移動そのものには使わない。あちらの秒数は振付の情報
 * (何秒で移動するか)であって、見た目を整えるための値ではないため。
 */
export const OVERLAY_FADE_IN_SECONDS = 0.25;

/** 「動きを減らす」設定のときに使う、固定の遷移時間(秒)。
 *
 * 0にしないのは、このアプリの動きが装飾ではなく情報
 * (誰がどこへ移動するか)だから。瞬間移動にすると、シーン間で
 * 誰がどこへ動いたのかが読み取れなくなる。目が追う負担だけを下げる */
const REDUCED_MOTION_DURATION_SECONDS = 0.15;

/** OSの「動きを減らす」設定が入っているか。
 * アニメーションを開始する直前に読むので、フックではなく関数にしている */
function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** 実際に使う遷移秒数。設定が入っていれば頭打ちにする */
export function resolveTransitionDuration(seconds: number): number {
  return prefersReducedMotion()
    ? Math.min(seconds, REDUCED_MOTION_DURATION_SECONDS)
    : seconds;
}

/**
 * これより近く置くと、**上の1人しか掴めなくなる**距離（**px**）。
 *
 * 当たり判定は前面の要素で決まるので、丸が重なると下の人へはクリックも
 * ドラッグも届かない（実機の報告 17-27）。
 *
 * ■ なぜ px なのか（実機の報告 17-5）
 * 掴めるかどうかは**丸の大きさ**（`MARKER_SIZE`）で決まる話で、ステージが
 * 何ユニットあるかとは関係が無い。ユニットで持っていたときは、広いステージ
 * ほど画面上のずれが大きくなり、狭いステージでは効かなくなっていた。
 * 使うときにステージの実寸から1ユニットあたりの px を出して換算する。
 *
 * ■ 判定とずらす量は同じ値
 * ずらした先がまだ「重なっている」と判定される距離だと、直したことに
 * ならない（`separateOverlaps` が8方向とも空きなしと見て諦める）。
 *
 * 丸の3.5割。これだけずれていれば下の人の縁が出て掴める。
 */
export const OVERLAP_DISTANCE_PX = Math.round(MARKER_SIZE * 0.35);

/**
 * 導線の曲線ハンドルが「まっすぐ」「左右対称」へ吸着し始める距離
 * （ステージ座標のユニット）。
 *
 * 格子の吸着（`GRID_SNAP_STEP`）より広い。あちらは線が縦横に何本も
 * 走っていて近くに必ず候補があるが、こちらは**寄せ先が中点の1点と
 * 直交する線1本しか無い**ので、同じ狭さだと狙って合わせられない。
 */
export const CURVE_SNAP_TOLERANCE_UNITS = 0.35;
