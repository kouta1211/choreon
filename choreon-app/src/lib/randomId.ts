/**
 * 主キーに使う UUID v4 を作る。
 *
 * Web版（`src/lib/randomId.ts`）と**同じ形式**を返すが、**最後の受け皿が1段
 * 多い**。理由:
 *
 * - `crypto.randomUUID()` はセキュアコンテキスト限定。ブラウザは localhost と
 *   https だけをセキュアとみなすので、`http://192.168.0.8:8081` を実機から
 *   開く Expo Go の経路では undefined になる（Web版のコメント参照）
 * - **ネイティブ（Hermes）には `crypto` がそもそも無い。** Web版はここで
 *   落ちるが、それだと「追加」を押した瞬間にアプリが止まる
 *
 * そこで crypto が1つも無ければ `Math.random` から組み立てる。乱数の質は
 * 落ちるが、ここで作るのは**この端末で作った行のID**であり、当たりにいく人が
 * いない。追加できない方が困る。
 */
export function randomId(): string {
  const webCrypto = (globalThis as { crypto?: Crypto }).crypto;

  if (typeof webCrypto?.randomUUID === 'function') {
    return webCrypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (typeof webCrypto?.getRandomValues === 'function') {
    webCrypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  // v4 の決まりごと: 7バイト目の上位4bitを 0100、9バイト目の上位2bitを 10 にする
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex: string[] = [];
  for (const byte of bytes) hex.push(byte.toString(16).padStart(2, '0'));
  return (
    hex.slice(0, 4).join('') +
    '-' +
    hex.slice(4, 6).join('') +
    '-' +
    hex.slice(6, 8).join('') +
    '-' +
    hex.slice(8, 10).join('') +
    '-' +
    hex.slice(10, 16).join('')
  );
}
