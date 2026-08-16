import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * アプリのアイコンとスプラッシュの絵を描く。
 *
 * ■ なぜ生成するのか
 * ネイティブ版のアイコンは **Expo のテンプレートのまま**（青地に「A」）
 * だった。スプラッシュも Expo のロゴ、ホーム画面に出る名前も
 * 「choreon-app」で、Choreon の見た目とは何の関係も無かった。
 *
 * Web版には本物のアイコン（`public/icon-512.png`）がある。同じ形を
 * 使いたいが、512 を 1024 へ引き伸ばすと縁がぼやける。**形は5つの円**
 * だけなので、その寸法（Web版の PNG から実測した比率）から描き直す。
 * 比率で持っているので、どのサイズでも同じ絵が出る。
 *
 * ■ 何を出すか
 *   icon.png                     1024  アプリのアイコン（iOS / 汎用）
 *   android-icon-foreground.png  1024  Android の前景（安全域の中に収める）
 *   android-icon-monochrome.png  1024  テーマアイコン用の白抜き
 *   splash-icon.png               512  起動時の絵（地の色は app.json）
 *   favicon.png                    48  Web版で開いたときのタブ
 *
 * 依存を足さずに書くため、PNG は自前で組む（真色 8bit・フィルタ無し）。
 *
 *   node scripts/generate-icons.mjs
 */

/** Web版の icon-512.png から実測した並び。中心と半径は一辺に対する比 */
const FORMATION = [
  { x: 0.499, y: 0.2732, r: 0.0781, accent: true },
  { x: 0.327, y: 0.4668, r: 0.0674, accent: false },
  { x: 0.6711, y: 0.4668, r: 0.0674, accent: false },
  { x: 0.1764, y: 0.7032, r: 0.0674, accent: false },
  { x: 0.8216, y: 0.7032, r: 0.0674, accent: false },
];

const BG = [25, 25, 28];
const DOT = [237, 237, 237];
const ACCENT = [236, 72, 153];

/**
 * Android の前景は**外側が切り落とされる**（丸や角丸など、端末が形を決める）。
 * 安全に見えるのは中央 66% ほどなので、そのぶん縮めて中央へ置く。
 */
const ANDROID_SAFE = 0.66;

function drawIcon({ size, scale = 1, background = BG, monochrome = false }) {
  const px = new Uint8Array(size * size * 4);
  // background が null なら透過のまま（Android の前景・スプラッシュ）
  if (background) {
    const [br, bg, bb] = background;
    for (let i = 0; i < size * size; i++) {
      px[i * 4] = br;
      px[i * 4 + 1] = bg;
      px[i * 4 + 2] = bb;
      px[i * 4 + 3] = 255;
    }
  }

  for (const dot of FORMATION) {
    // 縮めるときは中心も一緒に中央へ寄せる（形が崩れないように）
    const cx = (0.5 + (dot.x - 0.5) * scale) * size;
    const cy = (0.5 + (dot.y - 0.5) * scale) * size;
    const r = dot.r * scale * size;
    const color = monochrome ? [255, 255, 255] : dot.accent ? ACCENT : DOT;

    const x0 = Math.max(0, Math.floor(cx - r - 2));
    const x1 = Math.min(size - 1, Math.ceil(cx + r + 2));
    const y0 = Math.max(0, Math.floor(cy - r - 2));
    const y1 = Math.min(size - 1, Math.ceil(cy + r + 2));

    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        // 縁を滑らかにする。1px ぶんの幅で 0→1 に混ぜるだけの素朴な形で、
        // 円のような単純な図形ならこれで十分きれいに出る
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        const cover = Math.min(1, Math.max(0, r + 0.5 - d));
        if (cover <= 0) continue;
        const o = (y * size + x) * 4;
        const a = px[o + 3] / 255;
        const outA = cover + a * (1 - cover);
        for (let c = 0; c < 3; c++) {
          px[o + c] = Math.round(
            (color[c] * cover + px[o + c] * a * (1 - cover)) / (outA || 1),
          );
        }
        px[o + 3] = Math.round(outA * 255);
      }
    }
  }
  return px;
}

/** RGBA の配列を PNG のバイト列にする（真色＋アルファ・フィルタ無し） */
function encodePng(px, size) {
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(px.buffer, y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }

  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([len, body, crc]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // 8bit
  ihdr[9] = 6; // truecolour + alpha
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return c ^ -1;
}

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', 'assets', 'images');
mkdirSync(outDir, { recursive: true });

const files = [
  { name: 'icon.png', size: 1024, opts: {} },
  // Android の前景は地を敷かない（背景は app.json の backgroundColor）
  {
    name: 'android-icon-foreground.png',
    size: 1024,
    opts: { scale: ANDROID_SAFE, background: null },
  },
  {
    name: 'android-icon-monochrome.png',
    size: 1024,
    opts: { scale: ANDROID_SAFE, background: null, monochrome: true },
  },
  // スプラッシュは地の色を app.json 側で敷くので、絵だけ透過で置く
  { name: 'splash-icon.png', size: 512, opts: { scale: 0.8, background: null } },
  { name: 'favicon.png', size: 48, opts: {} },
];

for (const file of files) {
  const px = drawIcon({ size: file.size, ...file.opts });
  writeFileSync(join(outDir, file.name), encodePng(px, file.size));
  console.log('書いた:', file.name, `${file.size}x${file.size}`);
}
