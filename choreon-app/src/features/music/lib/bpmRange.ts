/**
 * 曲に合わせるための3つの値が取れる範囲。
 *
 * ■ どれも【作品】が持つ（端末ではない）
 * 音源は端末から出さない方針なので、共有された相手の画面に出せる時間の
 * 手がかりは「シーンの時刻」と「BPM・拍子」しか無い。ここが端末どまりだと、
 * 読むだけのビューアで見る人の画面ではカウントが引けない。
 * **鳴らすかどうか**（メトロノームのオン/オフ）だけは、その場に居る人の
 * 都合（稽古場か電車か）なので端末の好み。
 *
 * ■ 上限と下限は DB の制約と揃える
 * 弾かれるのがサーバーからの返事だと、押した瞬間には通ったように見えて
 * あとから戻る。手前で丸めておけば、その場で止まる。
 */

/** 振付で使う曲はおおむね 60〜200 に収まる。Web版と同じ幅 */
export const MIN_BPM = 40;
export const MAX_BPM = 240;
export const DEFAULT_BPM = 120;

/** DB の制約（2〜12）と合わせてある */
export const MIN_BEATS_PER_BAR = 2;
export const MAX_BEATS_PER_BAR = 12;
export const DEFAULT_BEATS_PER_BAR = 4;

/**
 * 曲の開始位置の上限。
 *
 * 1時間。これより長いイントロは無く、桁を打ち間違えたとき
 * （12.5 のつもりで 125000）に、時間軸が誰にも読めない幅へ飛ぶのを防ぐ。
 */
export const MAX_MUSIC_OFFSET_SECONDS = 3600;

export function clampBpm(bpm: number): number {
  if (!Number.isFinite(bpm)) return DEFAULT_BPM;
  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(bpm)));
}

export function clampBeatsPerBar(beatsPerBar: number): number {
  if (!Number.isFinite(beatsPerBar)) return DEFAULT_BEATS_PER_BAR;
  return Math.min(
    MAX_BEATS_PER_BAR,
    Math.max(MIN_BEATS_PER_BAR, Math.round(beatsPerBar)),
  );
}

/**
 * 曲の開始位置。**0.1秒まで**にする。
 *
 * イントロの頭出しは耳で合わせるもので、それより細かい桁を打っても
 * 聞き分けられない。丸めておくと、時間軸に出る数字も短くなる。
 */
export function clampMusicOffset(seconds: number): number {
  if (!Number.isFinite(seconds)) return 0;
  const bounded = Math.min(MAX_MUSIC_OFFSET_SECONDS, Math.max(0, seconds));
  return Math.round(bounded * 10) / 10;
}
