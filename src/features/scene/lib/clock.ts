/**
 * 秒を、人が読む時計の形にする。
 *
 * ■ なぜ1箇所にまとめたか(2026-08-21)
 * 同じ名前の `formatClock` が **4つのファイルに別々に**書かれていた。
 * しかも中身がそろっていない:
 *
 *   - 0.1秒まで出すもの2つ … 片方だけ負の値を 0 で止めていた
 *   - 秒までのもの2つ …… 片方は切り捨て、片方は 0 止め
 *
 * **片方を直しても、もう片方は黙って古いまま**という形。
 * 出す形が3通りあるのは意味があるので、**意味の名前を付けて**ここへ置く。
 *
 * ■ 負の値は 0 で止める
 * 時刻が負になるのは計算の途中（頭出しより前を指したときなど）で、
 * 画面に `-1:-5.0` と出しても読む人には何の情報も無い。
 */

/** 負の秒を 0 に丸める。時計に負の時刻は無い */
const atLeastZero = (seconds: number) => Math.max(0, seconds);

/**
 * **位置**を 0.1秒まで。`3:07.5`
 * 編集で「どこを指しているか」を見るための形で、刻みが要る。
 */
export function formatClock(seconds: number): string {
  const safe = atLeastZero(seconds);
  const minutes = Math.floor(safe / 60);
  const rest = safe - minutes * 60;
  return `${minutes}:${rest.toFixed(1).padStart(4, "0")}`;
}

/**
 * **長さ**を秒まで。`3:08`（四捨五入）
 * 通しの尺・曲の長さのように「だいたいどれくらいか」を読む形。
 */
export function formatMinutes(seconds: number): string {
  const safe = Math.round(atLeastZero(seconds));
  const minutes = Math.floor(safe / 60);
  return `${minutes}:${String(safe - minutes * 60).padStart(2, "0")}`;
}

/**
 * **経過**を秒まで。`3:07`（切り捨て）
 * 動画に焼く時計。**ここだけ切り捨てなのは、ストップウォッチだから** —
 * 四捨五入すると 3:07.5 の絵に 3:08 と書かれ、0.5秒ぶん先に進んで見える。
 */
export function formatElapsed(seconds: number): string {
  const whole = Math.floor(atLeastZero(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}
