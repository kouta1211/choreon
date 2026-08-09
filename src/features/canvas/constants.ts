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
