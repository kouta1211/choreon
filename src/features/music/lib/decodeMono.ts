/**
 * 曲(Blob)を、**1本の波**にして返す。拍の検出(`beatDetect`)へ渡すため。
 *
 * ■ なぜ `waveformPeaks` と別なのか
 * あちらは「山の高さの列」を作るのが仕事で、**元の波は捨てている**
 * (3分の曲で 800万個の数を持ち続けるわけにいかないため)。
 * 拍の検出は元の波が要るので、要るときにだけここで読む。
 *
 * ■ 左右は足して1本にする
 * 拍は左右のどちらにも出る。片方だけ見ると、片チャンネルに寄せた
 * 音作りの曲で拾えなくなる。
 *
 * 読めなければ null。**失敗しても止めない** — 拍が出ないだけで、
 * 時間軸そのものは成立する(`decodeWaveform` と同じ考え方)。
 */

export type MonoAudio = {
  samples: Float32Array;
  sampleRate: number;
  durationSeconds: number;
};

export async function decodeMono(blob: Blob): Promise<MonoAudio | null> {
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

    const length = audio.length;
    const channelCount = audio.numberOfChannels;
    if (length === 0 || channelCount === 0) return null;

    const samples = new Float32Array(length);
    for (let channel = 0; channel < channelCount; channel += 1) {
      const data = audio.getChannelData(channel);
      for (let i = 0; i < length; i += 1) samples[i] += data[i];
    }
    if (channelCount > 1) {
      for (let i = 0; i < length; i += 1) samples[i] /= channelCount;
    }

    return {
      samples,
      sampleRate: audio.sampleRate,
      durationSeconds: audio.duration,
    };
  } catch {
    return null;
  } finally {
    // 読み終えたら閉じる。曲を選び直すたびに context が積もらないように
    void context?.close().catch(() => {});
  }
}
