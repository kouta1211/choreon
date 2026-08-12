/**
 * 曲を「山の高さの列」に潰す。波形を描くための下ごしらえ。
 *
 * ■ なぜ自前で作るのか
 * 波形を描くライブラリ(wavesurfer.js など)は、描画まで面倒を見る代わりに
 * 色を自分で決めてしまう。このアプリはテーマが10種類あり、色は必ず
 * CSS変数を経由しなければならない。ライブラリに描かせると、そこだけ
 * テーマから外れる。
 *
 * 一方で「音を読み込んで山の高さにする」処理自体は、AudioContext の
 * decodeAudioData を呼んで最大値を取るだけで、依存を増やすほどの量ではない。
 * そこで【数字を作るところまでを自前で持ち、描くのはCanvasへ】という
 * 分け方にしている。
 *
 * ■ 何を持つか
 * 音のサンプルは 1秒あたり 44100 個ある。5分の曲なら 1300万個で、
 * そのまま抱えると数十MBになる。描くのに要るのは「その一瞬でどれだけ
 * 大きな音が出たか」だけなので、区間ごとの最大値へ潰す。
 *
 * 潰す細かさは【いちばん拡大したときに1pxあたり1つ】で足りる。
 * それより細かく持っても画面に出ない。
 */

/** いちばん拡大した状態(120px/秒)で、1px に1つ */
export const PEAKS_PER_SECOND = 120;

/** 長い曲でも配列が際限なく膨らまないようにする上限。
 * 48000 で 400秒ぶん。それより長い曲は少し粗くなるが、
 * その頃には1画面に収まらないので見た目に出ない */
export const MAX_PEAKS = 48_000;

export type Waveform = {
  /** 0〜1に正規化された山の高さ。曲全体を等分したもの */
  peaks: Float32Array;
  /** 曲の長さ(秒)。peaks の1つぶんが何秒かを出すのに要る */
  durationSeconds: number;
};

/** その長さの曲を何個の山で表すか */
export function peakCount(durationSeconds: number): number {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return 0;
  return Math.min(
    MAX_PEAKS,
    Math.max(1, Math.ceil(durationSeconds * PEAKS_PER_SECOND)),
  );
}

/**
 * サンプルの列を、区間ごとの最大値へ潰す。
 *
 * 平均ではなく最大を採るのは、波形が「どれだけ大きな音が出たか」を
 * 示すものだから。平均にすると、短い打撃音(スネアなど)が均されて消え、
 * 曲の切れ目を目で探せなくなる。
 *
 * 最後に全体の最大で割って 0〜1 に正規化する。録音の小さい曲でも
 * 帯いっぱいまで山が立つようにするため。
 */
export function computePeaks(
  channels: Float32Array[],
  count: number,
): Float32Array {
  const peaks = new Float32Array(Math.max(0, count));
  if (count <= 0 || channels.length === 0) return peaks;

  const length = channels[0].length;
  if (length === 0) return peaks;

  let loudest = 0;
  for (let bucket = 0; bucket < count; bucket += 1) {
    const from = Math.floor((bucket * length) / count);
    // 区間が空にならないようにする(サンプル数より山の数が多い場合)
    const to = Math.min(
      length,
      Math.max(from + 1, Math.floor(((bucket + 1) * length) / count)),
    );

    let peak = 0;
    for (const samples of channels) {
      for (let i = from; i < to; i += 1) {
        const value = Math.abs(samples[i]);
        if (value > peak) peak = value;
      }
    }
    peaks[bucket] = peak;
    if (peak > loudest) loudest = peak;
  }

  if (loudest > 0) {
    for (let i = 0; i < count; i += 1) peaks[i] /= loudest;
  }
  return peaks;
}

/**
 * [fromSeconds, toSeconds) のいちばん高い山。Canvasの1列ぶんを描くのに使う。
 *
 * 拡大しているときは1つの山が何pxにも広がり、引いているときは1pxに
 * 何十個も入る。どちらでも同じ呼び方で済むよう、秒で受けて最大値を返す。
 */
export function peakBetween(
  waveform: Waveform,
  fromSeconds: number,
  toSeconds: number,
): number {
  const { peaks, durationSeconds } = waveform;
  if (peaks.length === 0 || durationSeconds <= 0) return 0;

  const perSecond = peaks.length / durationSeconds;
  const from = Math.max(0, Math.floor(fromSeconds * perSecond));
  const to = Math.min(peaks.length, Math.max(from + 1, Math.ceil(toSeconds * perSecond)));
  if (from >= peaks.length) return 0;

  let peak = 0;
  for (let i = from; i < to; i += 1) {
    if (peaks[i] > peak) peak = peaks[i];
  }
  return peak;
}

/**
 * 曲(Blob)を読み込んで山の列にする。読めなければ null。
 *
 * 【失敗しても止めない】。波形が出ないだけで、時間軸そのもの(目盛り・
 * シーンのコマ・再生ヘッド)は波形が無くても成立する。対応していない
 * コーデックや壊れたファイルで画面ごと落とすことのないようにする。
 */
export async function decodeWaveform(blob: Blob): Promise<Waveform | null> {
  const Ctor =
    typeof window === "undefined"
      ? undefined
      : (window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext);
  if (!Ctor) return null;

  let context: AudioContext | null = null;
  try {
    const buffer = await blob.arrayBuffer();
    context = new Ctor();
    const audio = await context.decodeAudioData(buffer);

    const channels: Float32Array[] = [];
    for (let i = 0; i < audio.numberOfChannels; i += 1) {
      channels.push(audio.getChannelData(i));
    }

    return {
      peaks: computePeaks(channels, peakCount(audio.duration)),
      durationSeconds: audio.duration,
    };
  } catch {
    return null;
  } finally {
    // 読み終えたら閉じる。開きっぱなしにすると、曲を選び直すたびに
    // オーディオデバイスを掴んだままの context が積もる
    void context?.close().catch(() => {});
  }
}
