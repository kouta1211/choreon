/**
 * **曲と、画面が指している時刻を合わせる**（2026-09-26）。
 *
 * ■ なぜ判断を外へ出すのか
 * 鳴らしている間、時計は曲（`audio.currentTime`）で、それを毎フレーム
 * `currentSeconds` へ書き出す。ところが「帯を押して飛ぶ」操作は逆向きに
 * `currentSeconds` を動かすので、**両方向が同じ値を取り合う**。
 *
 * 素直に「ずれていたら曲を飛ばす」と書くと、いま書き出したばかりの
 * 値を読んで曲を飛ばし、その結果また書き出す、という**震え**になる。
 * 判断をここへ出して、境目までテストで縛る。
 */

/**
 * これ以上離れていたら、曲の側を合わせ直す。
 *
 * **1フレームぶんの進み（60fpsで約0.017秒）より十分大きく**取る。
 * 小さすぎると、書き出した値との誤差だけで飛ばし続けて震える。
 * 大きすぎると、押して飛んだのに曲が追いつかない。
 *
 * 0.25秒は、8カウント（BPM 120 で4秒）の16分の1ほど。
 * 人が「ずれている」と気づく手前で、押した操作には必ず反応する幅。
 */
export const RESEEK_THRESHOLD_SECONDS = 0.25;

/**
 * 曲を合わせ直すか。
 *
 * @param audioSeconds いま曲が鳴っている位置
 * @param wantedSeconds 画面が指している位置（`currentSeconds`）
 */
export function shouldReseek({
  audioSeconds,
  wantedSeconds,
}: {
  audioSeconds: number;
  wantedSeconds: number;
}): boolean {
  return Math.abs(audioSeconds - wantedSeconds) >= RESEEK_THRESHOLD_SECONDS;
}
