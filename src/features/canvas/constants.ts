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
