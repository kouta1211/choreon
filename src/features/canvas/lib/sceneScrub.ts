/**
 * ステージを横にドラッグして、前後のシーンへ「手で」隊形を動かすための純粋関数群。
 *
 * 再生ボタンによる移動が「時間が進捗を決める」のに対して、こちらは
 * 【指の移動量が進捗を決める】。途中で手を止めればその中間の隊形がそのまま出るので、
 * 「サビの入りで誰と誰がすれ違うのか」を、秒数に急かされずに確かめられる。
 *
 * DOM・React・dnd-kitに依存しない。ジェスチャの結線(CanvasBoard側)と
 * 座標の適用(DancerLayer側)から、判断の部分だけをここに集めている。
 * 数値は design_handoff_scene_manager/README.md の Interactions A に合わせた確定値。
 */

/** ジェスチャの軸。縦に確定した場合、そのジェスチャはスクラブとして扱わない */
export type ScrubAxis = "x" | "y";

/** この距離を超えて初めて軸を決める。1〜2pxで決めると、真横に払ったつもりの
 * 指でも最初の数pxが縦に出て、横スワイプが縦と誤判定される */
export const AXIS_LOCK_THRESHOLD_PX = 6;

/** 端(先頭で右へ・末尾で左へ)に引いたときの減衰率。0にして完全に止めるのではなく
 * 少しだけ動かすことで、「これ以上先は無い」ことを指に返す */
export const RUBBER_BAND_FACTOR = 0.22;

/** 1シーンぶんの距離のうち、これだけ動かせば「行く」と確定する */
export const COMMIT_DISTANCE_RATIO = 0.22;

/** 距離が足りなくても、この速さで払われたなら確定する(px/ms) */
export const FLICK_VELOCITY_PX_PER_MS = 0.5;

/** フリック判定に必要な最低距離。これが無いと、タップの微細な震えが
 * 「速い」と判定されてシーンが飛ぶ */
export const FLICK_MIN_DISTANCE_PX = 24;

/**
 * 開始点からの移動量から、ジェスチャの軸を決める。
 * まだどちらとも言えない(しきい値未満)間はnullを返し、判断を先送りする。
 */
export function resolveAxis(deltaX: number, deltaY: number): ScrubAxis | null {
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);
  if (Math.max(absX, absY) < AXIS_LOCK_THRESHOLD_PX) return null;
  return absX >= absY ? "x" : "y";
}

/**
 * 移動先のシーンが無い方向へ引いたぶんを減衰させる。
 * 移動先がある場合は指の動きをそのまま返す。
 */
export function applyRubberBand(deltaPx: number, hasTarget: boolean): number {
  return hasTarget ? deltaPx : deltaPx * RUBBER_BAND_FACTOR;
}

/**
 * 隊形モーフの進捗(0〜1)。spanは「カード1枚分＋隙間」で、
 * これだけ動かすと隣のシーンの隊形にぴったり重なる。
 */
export function scrubProgress(deltaPx: number, spanPx: number): number {
  if (spanPx <= 0) return 0;
  return Math.min(1, Math.abs(deltaPx) / spanPx);
}

type CommitInput = {
  /** 指を離した時点の移動量(px)。符号は向き */
  deltaPx: number;
  /** カード1枚分＋隙間(px) */
  spanPx: number;
  /** pointerdownからの経過(ms) */
  elapsedMs: number;
  /** その向きに移動先のシーンが在るか。無ければ確定しない */
  hasTarget: boolean;
};

/**
 * 指を離したときに、隣のシーンへ行くか元へ戻るか。
 *
 * 距離とフリックの二本立てにしているのは、片方だけでは取りこぼすため。
 * 距離だけだと、速く短く払う操作(スマートフォンで自然に出る)が毎回戻ってしまい、
 * 速さだけだと、ゆっくり確実に半分以上引いた操作が戻ってしまう。
 */
export function shouldCommitScrub({
  deltaPx,
  spanPx,
  elapsedMs,
  hasTarget,
}: CommitInput): boolean {
  if (!hasTarget) return false;

  const distance = Math.abs(deltaPx);
  if (distance > spanPx * COMMIT_DISTANCE_RATIO) return true;

  // 経過0msは「時刻が取れなかった」場合。速度が無限大になるので弾く
  if (elapsedMs <= 0) return false;

  const velocity = distance / elapsedMs;
  return (
    velocity > FLICK_VELOCITY_PX_PER_MS && distance > FLICK_MIN_DISTANCE_PX
  );
}

export function lerp(from: number, to: number, progress: number): number {
  return from + (to - from) * progress;
}

/** ステージ座標系の一点。positionsBySceneIdから引いたものをそのまま渡せる形 */
type Point = { x: number; y: number };

/** スクラブ中に実際に描くダンサーの位置と、その濃さ */
export type ScrubbedPoint = { x: number; y: number; opacity: number };

/**
 * 1人ぶんの、区間の途中の位置を求める。
 *
 * 両方のシーンに居れば素直に補間する。片側のシーンにしか居ない場合
 * (途中から出てくる/途中で捌ける振付)は、居る側の位置に留めたまま
 * 濃さだけで出入りさせる。座標を(0,0)などへ動かしてしまうと、
 * 舞台袖ではなくステージの隅へ滑っていくように見えるため。
 */
export function interpolateDancerPoint(
  from: Point | null | undefined,
  to: Point | null | undefined,
  progress: number,
): ScrubbedPoint | null {
  if (from && to) {
    return {
      x: lerp(from.x, to.x, progress),
      y: lerp(from.y, to.y, progress),
      opacity: 1,
    };
  }
  if (from) return { x: from.x, y: from.y, opacity: 1 - progress };
  if (to) return { x: to.x, y: to.y, opacity: progress };
  return null;
}
