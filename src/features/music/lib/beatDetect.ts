/**
 * 曲から**拍の方眼**（BPM と1拍目の位置）を出す。
 *
 * ■ なぜ要るのか
 * カウント軸で振付を組むには、拍の方眼が曲に合っていなければならない。
 * これまでは BPM を人がスライダーで当て、頭出しの秒がそのまま1拍目を
 * 兼ねていた。**当てられないから拍への吸着を切ってあり、切ってあるから
 * 手で合わせるしかない**、という詰まり方をしていた。
 *
 * ■ ここは【音の波から先】だけを受け持つ
 * 音源を読む(`decodeAudioData`)のは外側の仕事。ここは数の列を受けて
 * 数を返すだけなので、**合成したクリック音でテストできる**。
 *
 * ■ 手順は3段
 * 1. **立ち上がりの強さ**を並べる(`onsetEnvelope`)
 * 2. **自己相関でおおよその BPM**(`estimateTempo`)。倍・半分を正す
 * 3. **総当たりで BPM と位相を詰める**(`refineGrid`)。
 *    曲が長いほど、わずかな BPM のずれが末尾で大きな差になるので、
 *    **全長で採点すると小数まで決まる**
 *
 * ⚠️ **テンポが一定の曲向け**。生演奏や、途中で速さが変わる曲は外れる。
 */

/** 拍の方眼。これ1つでカウント軸が引ける */
export type BeatGrid = {
  /** 1分あたりの拍数。**小数を保つ** — 整数へ丸めると曲の末尾でずれる */
  bpm: number;
  /** 1拍目が曲の何秒目か */
  originSeconds: number;
  /**
   * どれくらい当たっていそうか(0〜1)。
   * **拍の位置の音が、平らな所の何倍あるか**で測っている。
   * 「絶対に正しい確率」ではない — 低いときに人へ確かめる合図に使う。
   * ⚠️ **周期があれば高く出る。** それが音楽の拍かどうかまでは見ていない
   */
  confidence: number;
};

/** 音の立ち上がりの強さを、一定の間隔で並べたもの */
export type OnsetEnvelope = {
  /** 立ち上がりの強さ。0以上。いちばん強い所が1 */
  strength: Float32Array;
  /** strength の1コマが何秒か */
  secondsPerFrame: number;
};

/** 探す範囲。これより外は、そもそも踊る速さではない */
export const MIN_DETECT_BPM = 60;
export const MAX_DETECT_BPM = 200;
/** 倍・半分を正すときに寄せる帯。人が「その速さで踊る」と感じる範囲 */
const PREFERRED_MIN_BPM = 90;
const PREFERRED_MAX_BPM = 180;

/** 立ち上がりを測る間隔。約6ミリ秒 — 1拍(0.5秒)を80コマ以上に刻める */
const FRAME_SECONDS = 0.0058;
/** 蹴りを拾うための低域の目安(Hz)。一極なので緩やかに切れる */
const LOW_BAND_HZ = 200;

/**
 * 音の波から、**立ち上がりの強さ**の列を作る。
 *
 * ■ 低い方と全体の2本を足す
 * ダンス曲は蹴り(キック)が拍の位置にあるので低域だけでよく当たるが、
 * 蹴りの無い曲では何も拾えなくなる。全体の変化も混ぜて、
 * **どちらかが効けば拾える**ようにしてある。
 */
export function onsetEnvelope(
  samples: Float32Array,
  sampleRate: number,
): OnsetEnvelope {
  const hop = Math.max(1, Math.round(sampleRate * FRAME_SECONDS));
  const frames = Math.floor(samples.length / hop);
  if (frames < 2) return emptyEnvelope(hop, sampleRate);

  /* 一極の低域通過。係数は「1標本でどれだけ前の値を引きずるか」。
     カットオフを角周波数へ直してから指数で落とす */
  const decay = Math.exp((-2 * Math.PI * LOW_BAND_HZ) / sampleRate);
  const lowRms = new Float32Array(frames);
  const fullRms = new Float32Array(frames);

  let lowState = 0;
  for (let frame = 0; frame < frames; frame += 1) {
    let lowSum = 0;
    let fullSum = 0;
    const start = frame * hop;
    for (let i = start; i < start + hop; i += 1) {
      const value = samples[i];
      lowState = value * (1 - decay) + lowState * decay;
      lowSum += lowState * lowState;
      fullSum += value * value;
    }
    lowRms[frame] = Math.sqrt(lowSum / hop);
    fullRms[frame] = Math.sqrt(fullSum / hop);
  }

  /* 立ち上がり＝【増えた分】だけを見る。減った分は拍の手掛かりにならない */
  const strength = new Float32Array(frames);
  for (let frame = 1; frame < frames; frame += 1) {
    const low = Math.max(0, lowRms[frame] - lowRms[frame - 1]);
    const full = Math.max(0, fullRms[frame] - fullRms[frame - 1]);
    strength[frame] = low + full * 0.5;
  }

  /* **音そのものの大きさと比べて、立ち上がりが無いに等しいなら 0 にする。**
     ここを素通しで normalize すると、伸ばした音(拍の無い音)でも
     計算の誤差がいちばん強い所を1に引き伸ばし、**無いはずの拍が
     見えてしまう**。normalize は「有る山」を揃えるための道具で、
     「山が無い」ことを消してはいけない */
  let signalLevel = 0;
  for (const value of fullRms) signalLevel += value;
  signalLevel /= frames;
  let peak = 0;
  for (const value of strength) if (value > peak) peak = value;
  if (peak <= signalLevel * 1e-3) return emptyEnvelope(hop, sampleRate);

  normalize(strength);
  return { strength, secondsPerFrame: hop / sampleRate };
}

function emptyEnvelope(hop: number, sampleRate: number): OnsetEnvelope {
  return { strength: new Float32Array(0), secondsPerFrame: hop / sampleRate };
}

/**
 * おおよその BPM を、自己相関で出す。**まだ小数までは決まらない**
 * (1コマ ≒ 6ミリ秒の刻みしか無いので、速い曲では数 BPM の幅が出る)。
 *
 * ■ 倍・半分を正す
 * 拍の裏にも音があると、**2倍の速さ**を答えてしまう(240 BPM の曲は
 * まず無い)。人が踊る帯(90〜180)へ入るまで倍・半分にして寄せる。
 */
export function estimateTempo(envelope: OnsetEnvelope): number | null {
  const { strength, secondsPerFrame } = envelope;
  if (strength.length < 4) return null;

  const minLag = Math.max(1, Math.floor(60 / MAX_DETECT_BPM / secondsPerFrame));
  const maxLag = Math.ceil(60 / MIN_DETECT_BPM / secondsPerFrame);
  if (maxLag >= strength.length) return null;

  let bestLag = 0;
  let bestScore = -1;
  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let score = 0;
    for (let i = 0; i + lag < strength.length; i += 1) {
      score += strength[i] * strength[i + lag];
    }
    // 長い lag ほど足す回数が減るので、回数で割ってから比べる
    score /= strength.length - lag;
    if (score > bestScore) {
      bestScore = score;
      bestLag = lag;
    }
  }
  if (bestLag === 0) return null;

  return foldIntoPreferredRange(60 / (bestLag * secondsPerFrame));
}

/** 倍・半分にして、人が踊る帯へ寄せる */
function foldIntoPreferredRange(bpm: number): number {
  let folded = bpm;
  while (folded < PREFERRED_MIN_BPM && folded * 2 <= MAX_DETECT_BPM) {
    folded *= 2;
  }
  while (folded > PREFERRED_MAX_BPM && folded / 2 >= MIN_DETECT_BPM) {
    folded /= 2;
  }
  return folded;
}

/**
 * おおよその BPM の周りを総当たりして、**BPM と1拍目を詰める**。
 *
 * ■ なぜ総当たりで小数まで決まるのか
 * 3分の曲には拍が400近くある。BPM が 0.1 ずれていると、末尾では
 * **1拍ぶん近くずれる**。だから「全部の拍の位置で、立ち上がりの強さを
 * 足す」という採点をすると、**正しい BPM だけが飛び抜けて高くなる**。
 * 曲が長いほどよく効く。
 */
export function refineGrid(
  envelope: OnsetEnvelope,
  coarseBpm: number,
  searchWidthBpm = 3,
  stepBpm = 0.02,
): BeatGrid | null {
  const { strength, secondsPerFrame } = envelope;
  if (strength.length < 4) return null;

  const totalSeconds = strength.length * secondsPerFrame;
  /* 確信度の物差し。**方眼の上と、どこでもない所を比べる** */
  let envelopeMean = 0;
  for (const value of strength) envelopeMean += value;
  envelopeMean /= strength.length;

  let bestBpm = 0;
  let bestOrigin = 0;
  let bestScore = -1;
  let scoreCount = 0;

  const from = Math.max(MIN_DETECT_BPM, coarseBpm - searchWidthBpm);
  const to = Math.min(MAX_DETECT_BPM, coarseBpm + searchWidthBpm);

  for (let bpm = from; bpm <= to; bpm += stepBpm) {
    const beatSeconds = 60 / bpm;
    /* 位相は1拍ぶんだけ試せばよい(それ以上ずらすと同じ並びに戻る) */
    const phaseSteps = Math.max(1, Math.round(beatSeconds / secondsPerFrame));
    for (let phase = 0; phase < phaseSteps; phase += 1) {
      const originSeconds = phase * secondsPerFrame;
      const score = scoreGrid(
        strength,
        secondsPerFrame,
        totalSeconds,
        bpm,
        originSeconds,
      );
      scoreCount += 1;
      if (score > bestScore) {
        bestScore = score;
        bestBpm = bpm;
        bestOrigin = originSeconds;
      }
    }
  }

  if (scoreCount === 0 || bestScore <= 0) return null;

  /* confidence は【方眼の上が、平らな所の何倍か】。
     1倍なら「拍の位置に何も無い」＝拍を見つけていない。
     **別の BPM と比べた相対値にしない** — 拍の無い音でも、どれか1つは
     いちばん高くなるので、それでは必ず高い確信度が出てしまう */
  const ratio = envelopeMean > 0 ? bestScore / envelopeMean : 0;
  return {
    bpm: round(bestBpm, 2),
    originSeconds: round(bestOrigin, 4),
    confidence: Math.max(0, Math.min(1, (ratio - 1) / 3)),
  };
}

/** その方眼に沿って、拍の所にどれだけ音の立ち上がりがあるか */
function scoreGrid(
  strength: Float32Array,
  secondsPerFrame: number,
  totalSeconds: number,
  bpm: number,
  originSeconds: number,
): number {
  const beatSeconds = 60 / bpm;
  let score = 0;
  let beats = 0;
  for (let time = originSeconds; time < totalSeconds; time += beatSeconds) {
    score += sampleAt(strength, time / secondsPerFrame);
    beats += 1;
  }
  return beats === 0 ? 0 : score / beats;
}

/**
 * コマとコマの間を線で結んで読む。
 * **小数の BPM を決めているのはここ** — 刻みのまま読むと、
 * 6ミリ秒より細かい差が見えなくなる。
 */
function sampleAt(strength: Float32Array, frame: number): number {
  const index = Math.floor(frame);
  if (index < 0 || index + 1 >= strength.length) return 0;
  const fraction = frame - index;
  return strength[index] * (1 - fraction) + strength[index + 1] * fraction;
}

/**
 * 1拍目を、**8カウントの頭**へ寄せる。
 *
 * 拍の位置が合っていても、どれが「1」かは別の話。8拍のうち
 * どこを頭にすると音が強いかで決める(多くの曲は8カウントの頭が強い)。
 */
export function alignToDownbeat(
  envelope: OnsetEnvelope,
  grid: BeatGrid,
  beatsPerSet = 8,
): BeatGrid {
  const { strength, secondsPerFrame } = envelope;
  if (strength.length < 4 || beatsPerSet < 2) return grid;

  const totalSeconds = strength.length * secondsPerFrame;
  const beatSeconds = 60 / grid.bpm;
  let bestShift = 0;
  let bestScore = -1;

  for (let shift = 0; shift < beatsPerSet; shift += 1) {
    let score = 0;
    let hits = 0;
    for (
      let time = grid.originSeconds + shift * beatSeconds;
      time < totalSeconds;
      time += beatSeconds * beatsPerSet
    ) {
      score += sampleAt(strength, time / secondsPerFrame);
      hits += 1;
    }
    const average = hits === 0 ? 0 : score / hits;
    if (average > bestScore) {
      bestScore = average;
      bestShift = shift;
    }
  }

  return {
    ...grid,
    originSeconds: round(grid.originSeconds + bestShift * beatSeconds, 4),
  };
}

/**
 * 音の波から拍の方眼を出す。**外側から呼ぶのはこれ1つ**。
 *
 * @param samples モノラルに落とした音の波
 * @param sampleRate 1秒あたりの標本数
 * @param beatsPerSet 1セットの拍数。稽古場で数える単位(既定は8カウント)
 */
export function detectBeatGrid(
  samples: Float32Array,
  sampleRate: number,
  beatsPerSet = 8,
): BeatGrid | null {
  if (samples.length === 0 || sampleRate <= 0) return null;

  const envelope = onsetEnvelope(samples, sampleRate);
  const coarse = estimateTempo(envelope);
  if (coarse === null) return null;

  const refined = refineGrid(envelope, coarse);
  if (!refined) return null;

  return alignToDownbeat(envelope, refined, beatsPerSet);
}

/** いちばん強い所を1に揃える。録音の大きさに左右されないため */
function normalize(values: Float32Array): void {
  let max = 0;
  for (const value of values) if (value > max) max = value;
  if (max === 0) return;
  for (let i = 0; i < values.length; i += 1) values[i] /= max;
}

function round(value: number, digits: number): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}
