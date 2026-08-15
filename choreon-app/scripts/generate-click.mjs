/**
 * メトロノームのクリック音を作る。
 *
 * ■ なぜ生成するのか
 * Web版は Web Audio API の発振器で「その場で」音を作っているが、
 * **React Native に Web Audio API は無い**。expo-audio は
 * 「用意された音を鳴らす」ものなので、鳴らす中身をファイルで持つ必要がある。
 *
 * 録音を持ち込む代わりに、Web版と同じ高さ（1600Hz / 1000Hz）の短い正弦波を
 * ここで書き出す。音の性格が Web とスマホでずれない。
 *
 * 作り直す: node scripts/generate-click.mjs
 * 出力: assets/click-downbeat.wav / assets/click-beat.wav（各 4KB 弱）
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, '..', 'assets');

/** 16bit・モノラル・44.1kHz。いちばん素直に鳴る形 */
const SAMPLE_RATE = 44100;
/** クリックの長さ（秒）。短く切らないと拍が団子になる（Web版と同じ 0.04） */
const SECONDS = 0.04;

/**
 * 正弦波を鳴らして、すぐ絞る。
 *
 * **切れ際を絞らないと「プツッ」と鳴る**（波形が途中で0へ飛ぶため）。
 * 立ち上がりも同じで、1ms かけて上げてから落とす。
 */
function renderClick(hz) {
  const total = Math.floor(SAMPLE_RATE * SECONDS);
  const attack = Math.floor(SAMPLE_RATE * 0.001);
  const samples = new Int16Array(total);

  for (let i = 0; i < total; i += 1) {
    const t = i / SAMPLE_RATE;
    // 立ち上がりは短く上げ、あとは終わりへ向けて絞る
    const rise = Math.min(1, i / attack);
    const fall = 1 - i / total;
    const gain = rise * fall * fall;
    samples[i] = Math.round(Math.sin(2 * Math.PI * hz * t) * gain * 0.6 * 32767);
  }
  return samples;
}

/** RIFF/WAVE のヘッダを付ける。44バイトの決まった形 */
function toWav(samples) {
  const header = Buffer.alloc(44);
  const dataBytes = samples.length * 2;

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataBytes, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // fmt チャンクの長さ
  header.writeUInt16LE(1, 20); // 1 = PCM
  header.writeUInt16LE(1, 22); // モノラル
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28); // 1秒あたりのバイト数
  header.writeUInt16LE(2, 32); // 1サンプルのバイト数
  header.writeUInt16LE(16, 34); // ビット深度
  header.write('data', 36);
  header.writeUInt32LE(dataBytes, 40);

  return Buffer.concat([header, Buffer.from(samples.buffer)]);
}

mkdirSync(OUT_DIR, { recursive: true });
for (const [name, hz] of [
  ['click-downbeat', 1600],
  ['click-beat', 1000],
]) {
  const file = join(OUT_DIR, `${name}.wav`);
  writeFileSync(file, toWav(renderClick(hz)));
  console.log('wrote', file);
}
