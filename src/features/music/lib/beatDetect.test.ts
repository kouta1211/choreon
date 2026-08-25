import { describe, expect, it } from "vitest";
import {
  alignToDownbeat,
  detectBeatGrid,
  estimateTempo,
  onsetEnvelope,
} from "./beatDetect";

/**
 * **合成したクリック音で縛る。**
 *
 * 本物の曲はテストに置けない(大きい・権利がある・結果が揺れる)が、
 * 「何 BPM で、1拍目がどこか」が分かっている音は作れる。
 * ここで守れるのは【正解が分かっている音を、正しく読めるか】までで、
 * **本物の曲で当たるかは実際に食わせて見るしかない**。
 */

/** テストは速さが要るので、標本は粗くてよい(声の帯は使っていない) */
const SAMPLE_RATE = 11025;

type ClickOptions = {
  bpm: number;
  seconds: number;
  /** 1拍目が何秒目か */
  originSeconds?: number;
  /** 何拍ごとに強く鳴らすか。0 なら全部同じ強さ */
  accentEvery?: number;
  /** 拍の裏にも鳴らすか(倍の速さに読み違えないかを見る) */
  offbeats?: boolean;
  /** 混ぜる雑音の大きさ */
  noise?: number;
};

/**
 * 低い「ドン」を拍の位置に置いた音を作る。
 * 低域を強くしてあるのは、`onsetEnvelope` が蹴りを拾う作りだから。
 */
function clickTrack({
  bpm,
  seconds,
  originSeconds = 0,
  accentEvery = 0,
  offbeats = false,
  noise = 0,
}: ClickOptions): Float32Array {
  const samples = new Float32Array(Math.round(seconds * SAMPLE_RATE));

  if (noise > 0) {
    /* 乱数は使わない(`Math.random` は結果が毎回変わる)。
       同じ式から出る、拍と揃わない揺れを混ぜる */
    for (let i = 0; i < samples.length; i += 1) {
      samples[i] = Math.sin(i * 0.7331) * Math.sin(i * 0.11117) * noise;
    }
  }

  const beatSeconds = 60 / bpm;
  const strike = (atSeconds: number, gain: number) => {
    const start = Math.round(atSeconds * SAMPLE_RATE);
    // 60Hz を 60ミリ秒で減衰させる。蹴りの形
    const length = Math.round(0.06 * SAMPLE_RATE);
    for (let i = 0; i < length; i += 1) {
      const index = start + i;
      if (index < 0 || index >= samples.length) break;
      const decay = Math.exp((-5 * i) / length);
      samples[index] += Math.sin((2 * Math.PI * 60 * i) / SAMPLE_RATE) * decay * gain;
    }
  };

  let beat = 0;
  for (let time = originSeconds; time < seconds; time += beatSeconds) {
    const isAccent = accentEvery > 0 && beat % accentEvery === 0;
    strike(time, isAccent ? 1 : 0.6);
    if (offbeats) strike(time + beatSeconds / 2, 0.5);
    beat += 1;
  }

  return samples;
}

describe("立ち上がりの強さを並べる", () => {
  it("拍の位置に山が立つ", () => {
    const envelope = onsetEnvelope(
      clickTrack({ bpm: 120, seconds: 4 }),
      SAMPLE_RATE,
    );

    expect(envelope.strength.length).toBeGreaterThan(100);
    // 0秒・0.5秒・1.0秒 …に山。間(0.25秒)は静か
    const at = (seconds: number) =>
      envelope.strength[Math.round(seconds / envelope.secondsPerFrame)];
    expect(at(0.5)).toBeGreaterThan(0.5);
    expect(at(1.0)).toBeGreaterThan(0.5);
    expect(at(0.75)).toBeLessThan(0.1);
  });

  it("短すぎる音では、何も並べない", () => {
    const envelope = onsetEnvelope(new Float32Array(10), SAMPLE_RATE);
    expect(envelope.strength.length).toBe(0);
  });
});

describe("おおよその BPM", () => {
  it("120 の曲を 120 前後で読む", () => {
    const envelope = onsetEnvelope(
      clickTrack({ bpm: 120, seconds: 20 }),
      SAMPLE_RATE,
    );
    expect(estimateTempo(envelope)).toBeCloseTo(120, -0.5);
  });

  /* ここが典型的な外し方。裏拍があると「2倍の速さ」に読める */
  it("拍の裏にも音があっても、倍の速さにしない", () => {
    const envelope = onsetEnvelope(
      clickTrack({ bpm: 128, seconds: 20, offbeats: true }),
      SAMPLE_RATE,
    );
    const bpm = estimateTempo(envelope);
    expect(bpm).not.toBeNull();
    // 256 ではなく 128 の側へ寄っていること
    expect(bpm as number).toBeLessThan(180);
  });

  it("遅い曲は、半分の速さに読み違えない", () => {
    const envelope = onsetEnvelope(
      clickTrack({ bpm: 76, seconds: 20 }),
      SAMPLE_RATE,
    );
    const bpm = estimateTempo(envelope);
    expect(bpm).not.toBeNull();
    // 76 は踊る帯の外なので、152 へ折り返して答える
    expect(bpm as number).toBeGreaterThan(90);
  });

  it("音が無ければ、答えない", () => {
    const envelope = onsetEnvelope(new Float32Array(4), SAMPLE_RATE);
    expect(estimateTempo(envelope)).toBeNull();
  });
});

describe("拍の方眼を出す（通し）", () => {
  /* **小数まで決まるか。** 整数へ丸めると、3分の曲の末尾で1拍近くずれる */
  it("小数の BPM を、小数のまま読む", () => {
    const grid = detectBeatGrid(
      clickTrack({ bpm: 128.4, seconds: 40, accentEvery: 8 }),
      SAMPLE_RATE,
    );

    expect(grid).not.toBeNull();
    expect((grid as { bpm: number }).bpm).toBeCloseTo(128.4, 1);
  });

  it("1拍目がずれている曲でも、その位置を当てる", () => {
    const grid = detectBeatGrid(
      clickTrack({
        bpm: 120,
        seconds: 40,
        originSeconds: 1.37,
        accentEvery: 8,
      }),
      SAMPLE_RATE,
    );

    expect(grid).not.toBeNull();
    const { originSeconds } = grid as { originSeconds: number };
    /* 8カウントの頭へ寄せるので、1.37 + 8拍の整数倍 のどれかに来る。
       拍1つぶん(0.5秒)の中に収まっていればよい */
    const beatSeconds = 0.5;
    const offBy = Math.abs(
      ((originSeconds - 1.37) % (beatSeconds * 8)) % beatSeconds,
    );
    expect(Math.min(offBy, beatSeconds - offBy)).toBeLessThan(0.06);
  });

  it("雑音が混ざっていても読める", () => {
    const grid = detectBeatGrid(
      clickTrack({ bpm: 132, seconds: 40, accentEvery: 8, noise: 0.15 }),
      SAMPLE_RATE,
    );

    expect(grid).not.toBeNull();
    expect((grid as { bpm: number }).bpm).toBeCloseTo(132, 0);
  });

  /* **確信度は、人へ確かめるかどうかの合図に使う。**
     拍の無い音で高く出ると、外れたまま黙って設定してしまう。

     ⚠️ 試す音は【周期の無い】ものでなければならない。伸ばした純音は
     枠の区切りとうなって**本当に周期ができる**ので、これで試すと
     「確信度が高い」と出る(音楽ではないが、周期はあるので正しい)。
     ここでは定常の雑音を使う */
  it("拍の無い音では、確信度が低い", () => {
    const flat = new Float32Array(SAMPLE_RATE * 20);
    let seed = 12345;
    for (let i = 0; i < flat.length; i += 1) {
      // 決まった種から出す擬似乱数(Math.random は毎回変わるので使わない)
      seed = (seed * 1103515245 + 12345) % 2147483648;
      flat[i] = (seed / 2147483648) * 2 - 1;
    }
    const grid = detectBeatGrid(flat, SAMPLE_RATE);

    // 答えが返っても、確信度で見分けられること
    if (grid !== null) expect(grid.confidence).toBeLessThan(0.5);
  });

  it("空の音では、答えない", () => {
    expect(detectBeatGrid(new Float32Array(0), SAMPLE_RATE)).toBeNull();
    expect(detectBeatGrid(new Float32Array(1000), 0)).toBeNull();
  });
});

describe("8カウントの頭へ寄せる", () => {
  it("強く鳴っている拍を「1」にする", () => {
    const samples = clickTrack({
      bpm: 120,
      seconds: 40,
      originSeconds: 0,
      accentEvery: 8,
    });
    const envelope = onsetEnvelope(samples, SAMPLE_RATE);

    /* わざと3拍ぶん手前へずらした方眼を渡す。
       強い拍(0秒・4秒・8秒…)の側へ戻ってくるはず */
    const shifted = alignToDownbeat(
      envelope,
      { bpm: 120, originSeconds: 1.5, confidence: 1 },
      8,
    );

    // 1.5秒から 0〜7拍ぶん進めた先。強拍は 4秒周期なので 4.0 に乗る
    const cycle = 4;
    const remainder = shifted.originSeconds % cycle;
    expect(Math.min(remainder, cycle - remainder)).toBeLessThan(0.06);
  });

  it("1セットの拍数が壊れていれば、そのまま返す", () => {
    const envelope = onsetEnvelope(
      clickTrack({ bpm: 120, seconds: 8 }),
      SAMPLE_RATE,
    );
    const grid = { bpm: 120, originSeconds: 0.25, confidence: 1 };
    expect(alignToDownbeat(envelope, grid, 1)).toEqual(grid);
  });
});
