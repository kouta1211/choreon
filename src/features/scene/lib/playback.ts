import type { Scene } from "@/features/scene/types";

/**
 * タイムライン再生中に「次はどのシーンへ進むか」を計算する純粋関数。
 * 現在のシーンがscenesの何番目かを探し、その次のシーンのidを返す。
 * currentSceneIdが見つからない場合・既に最後のシーンの場合はnull
 * (呼び出し側はnullを「再生終了」の合図として扱う)。
 */
export function getNextSceneId(
  scenes: Scene[],
  currentSceneId: string | null,
): string | null {
  const currentIndex = scenes.findIndex((scene) => scene.id === currentSceneId);
  if (currentIndex === -1 || currentIndex === scenes.length - 1) {
    return null;
  }
  return scenes[currentIndex + 1].id;
}

/**
 * 最初から最後まで再生したときの合計秒数。
 *
 * 先頭シーンのtransitionDurationSecondsは「そこへ入ってくる時間」で、
 * 先頭には入ってくる元が無いため足さない(schema.sqlにも「先頭のシーンの
 * 値は使われない」と書いてある通り)。つまりN個のシーンなら遷移はN-1回。
 *
 * 小数の足し算は 0.1 + 0.2 = 0.30000000000000004 になるため、
 * 表示用に小数第1位で丸めている(入力の刻みが0.1なのでこれで足りる)。
 */
export function totalTransitionSeconds(scenes: Scene[]): number {
  const total = scenes
    .slice(1)
    .reduce((sum, scene) => sum + scene.transitionDurationSeconds, 0);
  return Math.round(total * 10) / 10;
}
