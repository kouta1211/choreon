/**
 * 「作業日」を出す。**日付とは別の概念**。
 *
 * ■ なぜ要るか
 * 日付は 0:00 で変わるが、**作業は 0:00 では終わらない**。深夜1時に
 * 書いたコミットは、本人の感覚では前日の続きで、翌日の日報に1行だけ
 * 迷子で載っても意味が読めない（2026-08-18 に user の指摘）。
 *
 * そこで日の変わり目を **朝 5 時**にする。0:00〜4:59 の作業は前日に入る。
 *
 *   2026-08-19 02:00 に書いたコミット → 作業日は 2026-08-18
 *   2026-08-19 05:00 に書いたコミット → 作業日は 2026-08-19
 *
 * ■ なぜ 5 時か
 * **保守点検のルーティンが朝 5 時に回っている**（daily-maintenance）。
 * 日の変わり目を2つ持つと必ずずれるので、そこへ合わせた。
 * 変えたければ下の定数1つ。
 *
 * ■ 時刻はすべて端末のローカル時刻
 * `toISOString()` を使わないのはそのため（UTC へ寄って日付がずれる）。
 * 日本には夏時間が無いので、ミリ秒を引いてからローカルの年月日を読む形で
 * ずれない。夏時間のある地域へ持っていくときはここを疑う。
 *
 * 使い方:
 *   node scripts/workday.mjs                     いまの作業日   → 2026-08-18
 *   node scripts/workday.mjs --since             その始まり     → 2026-08-18 05:00:00
 *   node scripts/workday.mjs --until             その終わり     → 2026-08-19 05:00:00
 *   node scripts/workday.mjs --at "2026-08-19T02:00"   確かめ用
 */

/** 日の変わり目（時）。ここだけ変えれば全部ついてくる */
export const WORKDAY_START_HOUR = 5;

const pad = (n) => String(n).padStart(2, "0");

/** ローカルの年月日を YYYY-MM-DD で。toISOString は UTC へ寄るので使わない */
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** git の --since / --until がそのまま受け取れる形 */
const stamp = (d) => `${ymd(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`;

/**
 * その瞬間が属する作業日。
 * 変わり目のぶんだけ時計を戻してから日付を読む（月またぎ・年またぎは
 * Date の側が面倒を見る）。
 */
export function workdayOf(at = new Date()) {
  return ymd(new Date(at.getTime() - WORKDAY_START_HOUR * 3600_000));
}

/**
 * その作業日の範囲。`git log --since=… --until=…` へ渡す。
 * 始まりは当日の 5:00、終わりは翌日の 5:00。
 */
export function workdayRange(day = workdayOf()) {
  const [y, m, d] = day.split("-").map(Number);
  return {
    since: stamp(new Date(y, m - 1, d, WORKDAY_START_HOUR)),
    until: stamp(new Date(y, m - 1, d + 1, WORKDAY_START_HOUR)),
  };
}

/* ── CLI ───────────────────────────────────────────── */
if (process.argv[1] && process.argv[1].endsWith("workday.mjs")) {
  const at = process.argv.indexOf("--at");
  const now = at === -1 ? new Date() : new Date(process.argv[at + 1]);
  if (Number.isNaN(now.getTime())) {
    console.error("--at が日時として読めません（例: 2026-08-19T02:00）");
    process.exit(1);
  }
  const day = workdayOf(now);
  const range = workdayRange(day);
  if (process.argv.includes("--since")) console.log(range.since);
  else if (process.argv.includes("--until")) console.log(range.until);
  else console.log(day);
}
