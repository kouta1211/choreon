/**
 * 通し再生の時計を1コマ進める計算。
 *
 * ■ なぜ「経過した秒」をそのまま足さないか
 * 稽古場では、再生したまま画面を消す・別のアプリへ移ることがある。
 * その間ブラウザはコマを描かないので、戻ってきた最初のコマには
 * **消していた間ぜんぶ**の秒数が乗ってくる。素直に足すと、戻った瞬間に
 * 最後のシーンまで飛ぶ（2026-08-19 に発見）。
 *
 * 1コマで進める量に上限を置いて、飛ばずにその場から続きを再生する。
 * 「止めていた間も曲は進んでいた」ことにする作りもあるが、見る人が
 * したいのは**続きを見る**ことで、時報を合わせることではない。
 */

/** 1コマで進めてよい秒数の上限。これを超えた分は「画面が止まっていた」とみなす */
export const MAX_FRAME_SECONDS = 0.5;

export function stepPlayback({
  currentSeconds,
  elapsedSeconds,
  lastSeconds,
}: {
  currentSeconds: number;
  /** 前のコマからの実測。負にもなりうる（端末の時計が戻ることがある） */
  elapsedSeconds: number;
  /** 最後のシーンの時刻。ここで止まる */
  lastSeconds: number;
}): { seconds: number; hasEnded: boolean } {
  const step = Math.min(Math.max(elapsedSeconds, 0), MAX_FRAME_SECONDS);
  const next = currentSeconds + step;
  if (next >= lastSeconds) return { seconds: lastSeconds, hasEnded: true };
  return { seconds: next, hasEnded: false };
}
