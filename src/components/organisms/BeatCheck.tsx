"use client";

import { useEffect, useRef, useState } from "react";
import { detectBeatGrid, type BeatGrid } from "@/features/music/lib/beatDetect";
import { decodeMono } from "@/features/music/lib/decodeMono";

/** 波形を描くための粗さ。1秒を400点にすれば、3分の曲でも7万点で済む */
const PEAKS_PER_SECOND = 400;
/** 画面に映す時間の幅。狭いほど、拍が音に乗っているかを目で追える */
const WINDOW_SECONDS = 6;
/** クリック音を何秒先まで予約しておくか */
const LOOKAHEAD_SECONDS = 0.25;

/** かかった時間も測る。**部品の外に置く** — 時計を読むのは
 *  純粋な処理ではないので、描画の中から呼ぶと lint が止める
 *  (react-hooks/purity。イベントの中かどうかまでは見分けられない) */
function timedDetect(
  samples: Float32Array,
  sampleRate: number,
  beatsPerSet: number,
): { grid: BeatGrid | null; elapsedMs: number } {
  const startedAt = performance.now();
  const grid = detectBeatGrid(samples, sampleRate, beatsPerSet);
  return { grid, elapsedMs: Math.round(performance.now() - startedAt) };
}

/** 波形を、粗い山の列に落とす。毎フレーム元の波を舐めると重い */
function buildPeaks(samples: Float32Array, sampleRate: number): Float32Array {
  const perPoint = Math.max(1, Math.round(sampleRate / PEAKS_PER_SECOND));
  const points = Math.floor(samples.length / perPoint);
  const peaks = new Float32Array(points);
  for (let point = 0; point < points; point += 1) {
    let peak = 0;
    const start = point * perPoint;
    for (let i = start; i < start + perPoint; i += 1) {
      const value = Math.abs(samples[i]);
      if (value > peak) peak = value;
    }
    peaks[point] = peak;
  }
  return peaks;
}

/**
 * **拍の自動検出を、本物の曲で確かめる道具**(作りかけ。`/beat-check`)。
 *
 * ■ 確かめるのは【耳】。目ではない
 * 最初は「波形の上に線を重ねれば見て分かる」と考えたが、**分からなかった**
 * (user の報告 2026-08-25)。20秒に40本の線が並ぶ絵で、山と線が数ミリ
 * ずれているかを見分けるのは人には無理だった。
 *
 * **曲に合わせて拍でクリックを鳴らす。** 音楽に乗っていれば合っている。
 * 音楽をやる人が昔からやっている確かめ方で、説明が要らない。
 *
 * ■ 直す手も置いてある
 * ×2 / ÷2 と、半拍ずらす、1拍ずらす。**耳で直せたなら、何を外したかが
 * 分かる** — それがそのまま検出を直す手掛かりになる。
 *
 * 文言は英語のまま。**user 向けの画面ではない**ので3言語へ足さない。
 */
export function BeatCheck() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const peaksRef = useRef<Float32Array | null>(null);
  /* クリック音は Web Audio で鳴らす。<audio> の再生イベントに合わせると
     数十ミリ秒ぶれて、**ずれているのが道具のせいか曲のせいか分からなくなる** */
  const contextRef = useRef<AudioContext | null>(null);
  const nextBeatRef = useRef(0);
  const gridRef = useRef<BeatGrid | null>(null);
  const beatsPerSetRef = useRef(8);
  const clickOnRef = useRef(true);

  const [grid, setGrid] = useState<BeatGrid | null>(null);
  const [status, setStatus] = useState("Pick a song to analyse it.");
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [beatsPerSet, setBeatsPerSet] = useState(8);
  const [isClickOn, setIsClickOn] = useState(true);
  const [countText, setCountText] = useState("–");

  gridRef.current = grid;
  beatsPerSetRef.current = beatsPerSet;
  clickOnRef.current = isClickOn;

  /** 再生中ずっと回る。クリックの予約・波形の描画・カウントの表示 */
  useEffect(() => {
    /** これから鳴る拍を、先回りして予約する */
    const scheduleClicks = (
      songTime: number,
      current: BeatGrid,
      perSet: number,
    ) => {
      const context = contextRef.current;
      if (!context || !clickOnRef.current) return;

      const beatSeconds = 60 / current.bpm;
      /* いま鳴っている所より手前の拍は飛ばす
         (曲を送った直後に、過ぎた拍が一斉に鳴らないように) */
      const currentBeat = Math.ceil(
        (songTime - current.originSeconds) / beatSeconds,
      );
      if (nextBeatRef.current < currentBeat) nextBeatRef.current = currentBeat;

      for (;;) {
        const beat = nextBeatRef.current;
        const beatTime = current.originSeconds + beat * beatSeconds;
        if (beatTime > songTime + LOOKAHEAD_SECONDS) break;
        if (beatTime >= songTime) {
          /* 曲の時刻と、音を出す装置の時刻を毎回つなぎ直す
             (2つの時計は少しずつずれる) */
          const at = context.currentTime + (beatTime - songTime);
          playClick(context, at, beat >= 0 && beat % perSet === 0);
        }
        nextBeatRef.current = beat + 1;
      }
    };

    /** いま聴いている所の周りだけ描く */
    const drawWindow = (
      songTime: number,
      current: BeatGrid,
      perSet: number,
    ) => {
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");
      const peaks = peaksRef.current;
      if (!canvas || !context || !peaks) return;

      const width = canvas.width;
      const height = canvas.height;
      context.clearRect(0, 0, width, height);

      /* 再生ヘッドは真ん中に固定して、曲の方を流す。ヘッドが右へ走る形だと、
         拍が音に乗っているかを目で追えない */
      const from = songTime - WINDOW_SECONDS / 2;
      const pxPerSecond = width / WINDOW_SECONDS;

      /* 色は直書き。**この道具は捨てる前提**なのでトークンを足さない
         (canvas は class を当てられない) */
      context.fillStyle = "#8a8296";
      for (let column = 0; column < width; column += 1) {
        const seconds = from + column / pxPerSecond;
        const index = Math.round(seconds * PEAKS_PER_SECOND);
        if (index < 0 || index >= peaks.length) continue;
        const barHeight = peaks[index] * height;
        context.fillRect(column, (height - barHeight) / 2, 1, barHeight);
      }

      const beatSeconds = 60 / current.bpm;
      const firstBeat = Math.floor(
        (from - current.originSeconds) / beatSeconds,
      );
      for (let beat = firstBeat; ; beat += 1) {
        const time = current.originSeconds + beat * beatSeconds;
        if (time > from + WINDOW_SECONDS) break;
        if (time < from) continue;
        const isDownbeat = beat >= 0 && beat % perSet === 0;
        context.fillStyle = isDownbeat ? "#f0559b" : "rgba(240,85,155,0.3)";
        context.fillRect(
          Math.round((time - from) * pxPerSecond),
          0,
          isDownbeat ? 2 : 1,
          height,
        );
      }

      context.fillStyle = "#ffffff";
      context.fillRect(Math.round(width / 2), 0, 1, height);
    };

    let frame = 0;
    const tick = () => {
      frame = requestAnimationFrame(tick);
      const audio = audioRef.current;
      const current = gridRef.current;
      if (!audio || !current) return;

      const songTime = audio.currentTime;
      drawWindow(songTime, current, beatsPerSetRef.current);
      setCountText(formatCount(songTime, current, beatsPerSetRef.current));

      if (audio.paused) {
        nextBeatRef.current = 0;
        return;
      }
      scheduleClicks(songTime, current, beatsPerSetRef.current);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // 中身はすべて ref から読むので、張り直す必要が無い
  }, []);

  const analyse = async (file: File) => {
    setStatus(`Decoding ${file.name}…`);
    setGrid(null);
    setElapsedMs(null);
    peaksRef.current = null;

    const audio = await decodeMono(file);
    if (!audio) {
      setStatus("Could not decode this file.");
      return;
    }

    setStatus("Looking for the beat…");
    // 次の描画まで待たせないと、上の文字が出ないまま固まって見える
    await new Promise((resolve) => setTimeout(resolve, 0));

    const { grid: detected, elapsedMs: took } = timedDetect(
      audio.samples,
      audio.sampleRate,
      beatsPerSet,
    );
    setElapsedMs(took);
    peaksRef.current = buildPeaks(audio.samples, audio.sampleRate);

    if (!detected) {
      setStatus("No beat found.");
      return;
    }
    setGrid(detected);
    setStatus(`${file.name} — ${audio.durationSeconds.toFixed(1)}s`);

    const element = audioRef.current;
    if (element) element.src = URL.createObjectURL(file);
  };

  /** 音を出す装置は、人が押した瞬間に用意する(でないと鳴らない決まり) */
  const ensureContext = () => {
    if (!contextRef.current) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (Ctor) contextRef.current = new Ctor();
    }
    void contextRef.current?.resume().catch(() => {});
  };

  /** 耳で直す。**直せた形が、検出の何を外したかの答えになる** */
  const adjust = (change: (current: BeatGrid) => BeatGrid) => {
    setGrid((current) => (current ? change(current) : current));
    nextBeatRef.current = 0;
  };

  const halfBeat = grid ? 60 / grid.bpm / 2 : 0;
  const oneBeat = halfBeat * 2;

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-4 p-6 text-fg">
      <h1 className="text-title">Beat detection check</h1>
      <p className="text-body text-fg-muted">
        Development tool. Play the song: a click lands on every detected beat,
        with a higher click on the first of each set.{" "}
        <strong>If the clicks sit on the music, the grid is right.</strong> If
        they drift apart as the song goes on, the BPM is slightly off.
      </p>

      <div className="flex flex-wrap items-center gap-4">
        <input
          type="file"
          accept="audio/*"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void analyse(file);
          }}
        />
        <label className="flex items-center gap-2 text-body">
          Beats per set
          <input
            type="number"
            min={2}
            max={16}
            value={beatsPerSet}
            onChange={(event) => setBeatsPerSet(Number(event.target.value) || 8)}
            className="w-16 rounded-md border border-line bg-surface px-2 py-1"
          />
        </label>
        <label className="flex items-center gap-2 text-body">
          <input
            type="checkbox"
            checked={isClickOn}
            onChange={(event) => setIsClickOn(event.target.checked)}
          />
          Click
        </label>
      </div>

      <p className="text-body">{status}</p>

      {grid && (
        <>
          <div className="flex flex-wrap items-baseline gap-6 rounded-lg border border-line bg-surface p-4 font-mono">
            <span className="text-title tabular-nums">{countText}</span>
            <span className="text-body text-fg-muted">
              {grid.bpm.toFixed(2)} BPM · first beat{" "}
              {grid.originSeconds.toFixed(3)}s · confidence{" "}
              {grid.confidence.toFixed(2)}
            </span>
          </div>

          {/* 耳で直せるようにしておく。**直った形が手掛かりになる** */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-md border border-line px-3 py-1 text-body"
              onClick={() =>
                adjust((current) => ({ ...current, bpm: current.bpm * 2 }))
              }
            >
              BPM ×2
            </button>
            <button
              type="button"
              className="rounded-md border border-line px-3 py-1 text-body"
              onClick={() =>
                adjust((current) => ({ ...current, bpm: current.bpm / 2 }))
              }
            >
              BPM ÷2
            </button>
            <button
              type="button"
              className="rounded-md border border-line px-3 py-1 text-body"
              onClick={() =>
                adjust((current) => ({
                  ...current,
                  originSeconds: current.originSeconds - halfBeat,
                }))
              }
            >
              ← half a beat
            </button>
            <button
              type="button"
              className="rounded-md border border-line px-3 py-1 text-body"
              onClick={() =>
                adjust((current) => ({
                  ...current,
                  originSeconds: current.originSeconds + halfBeat,
                }))
              }
            >
              half a beat →
            </button>
            <button
              type="button"
              className="rounded-md border border-line px-3 py-1 text-body"
              onClick={() =>
                adjust((current) => ({
                  ...current,
                  originSeconds: current.originSeconds + oneBeat,
                }))
              }
            >
              move the “1” on by a beat
            </button>
          </div>
        </>
      )}

      <canvas
        ref={canvasRef}
        width={900}
        height={160}
        className="w-full rounded-lg border border-line bg-surface-sunken"
      />

      <audio ref={audioRef} controls className="w-full" onPlay={ensureContext} />

      {elapsedMs !== null && (
        <p className="text-caption text-fg-muted">
          Analysed in {elapsedMs} ms (the decode is not counted).
        </p>
      )}
    </main>
  );
}

/** 「2-5」の形。いまどのセットの何カウントを聴いているか */
function formatCount(
  songTime: number,
  grid: BeatGrid,
  beatsPerSet: number,
): string {
  const beat = Math.floor((songTime - grid.originSeconds) / (60 / grid.bpm));
  if (beat < 0) return "–";
  return `${Math.floor(beat / beatsPerSet) + 1}-${(beat % beatsPerSet) + 1}`;
}

/** 短い「コッ」。8カウントの頭だけ高くして、区切りが耳で分かるようにする */
function playClick(
  context: AudioContext,
  atSeconds: number,
  isDownbeat: boolean,
): void {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.frequency.value = isDownbeat ? 1600 : 1000;
  gain.gain.setValueAtTime(isDownbeat ? 0.5 : 0.28, atSeconds);
  gain.gain.exponentialRampToValueAtTime(0.0001, atSeconds + 0.05);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(atSeconds);
  oscillator.stop(atSeconds + 0.06);
}
