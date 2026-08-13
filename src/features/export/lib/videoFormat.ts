/**
 * 書き出す動画の形式を選ぶ。
 *
 * ■ なぜ mp4 を先に試すのか
 * 配る先は稽古仲間のスマートフォンで、LINE などにそのまま流される。
 * webm は iPhone の写真アプリでも LINE でも開けないことがあるので、
 * 【mp4 が使えるならmp4】にする。Safari 17 以降は MediaRecorder が
 * mp4 を吐けるので、iPhone で書き出したものは iPhone で開ける。
 *
 * ■ なぜ FFmpeg.wasm を今は使わないのか
 * webm → mp4 の変換のためだけに 25MB 前後の wasm を読み込むことになる。
 * 稽古場の回線で待たせる価値があるかは、実際に「Androidで書き出した動画が
 * iPhoneで開けない」と言われてから決めればよい。
 * そのときは、この関数の戻り値を見て変換を挟む形で足せる
 * (ここが唯一の分岐点になるように切ってある)。
 */

/** 上から順に試す。左が最優先 */
const VIDEO_CANDIDATES = [
  // Safari 17+ / iOS。配りやすさが段違いなので最優先
  { mimeType: "video/mp4;codecs=avc1.42E01E", extension: "mp4" },
  { mimeType: "video/mp4", extension: "mp4" },
  // Chrome / Firefox。vp9 の方が同じ画質で軽い
  { mimeType: "video/webm;codecs=vp9", extension: "webm" },
  { mimeType: "video/webm;codecs=vp8", extension: "webm" },
  { mimeType: "video/webm", extension: "webm" },
] as const;

export type VideoFormat = { mimeType: string; extension: string };

/**
 * この端末で書き出せる形式。1つも無ければ null(書き出しの入口を出さない)。
 *
 * 判定する関数を引数で受けるのは、テストのため。既定では
 * MediaRecorder.isTypeSupported を使う。
 */
export function pickVideoFormat(
  isTypeSupported?: (mimeType: string) => boolean,
): VideoFormat | null {
  const supported =
    isTypeSupported ??
    (typeof MediaRecorder === "undefined"
      ? null
      : (mimeType: string) => MediaRecorder.isTypeSupported(mimeType));

  if (!supported) return null;

  for (const candidate of VIDEO_CANDIDATES) {
    if (supported(candidate.mimeType)) {
      return { mimeType: candidate.mimeType, extension: candidate.extension };
    }
  }
  return null;
}

/**
 * 保存するときのファイル名。
 *
 * 作品名をそのまま使う。ファイル名に使えない文字だけを落とし、
 * 空になったら「formation」にする(名前が絵文字だけの作品もある)。
 */
export function videoFileName(title: string, extension: string): string {
  const safe = title
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 40)
    .trim();

  return `${safe || "formation"}.${extension}`;
}
