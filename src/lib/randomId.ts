/**
 * 主キーに使う UUID v4 を作る。
 *
 * `crypto.randomUUID()` をそのまま呼べない場面があるため、間に1枚挟んでいる。
 * このAPIは【セキュアコンテキスト限定】で、ブラウザは localhost と https だけを
 * セキュアとみなす。同じLANのスマートフォンから `http://192.168.0.8:3000` を
 * 開いて実機確認する経路(next.config.ts の allowedDevOrigins 参照)は
 * この条件から外れるため、`crypto.randomUUID` が undefined になり、
 * ダンサーやシーンを1件も追加できなくなっていた。
 *
 * `crypto.getRandomValues` の方はセキュアコンテキストの制限が無いので、
 * そちらから同じ形式(v4)を組み立てる。乱数の質は同じものを使っている。
 */
export function randomId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  // v4 の決まりごと: 7バイト目の上位4bitを 0100、9バイト目の上位2bitを 10 にする
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex: string[] = [];
  for (const byte of bytes) hex.push(byte.toString(16).padStart(2, "0"));
  return (
    hex.slice(0, 4).join("") +
    "-" +
    hex.slice(4, 6).join("") +
    "-" +
    hex.slice(6, 8).join("") +
    "-" +
    hex.slice(8, 10).join("") +
    "-" +
    hex.slice(10, 16).join("")
  );
}
