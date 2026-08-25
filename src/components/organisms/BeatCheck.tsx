"use client";

import { useRef, useState } from "react";
import { detectBeatGrid, type BeatGrid } from "@/features/music/lib/beatDetect";
import { decodeMono } from "@/features/music/lib/decodeMono";

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

/**
 * **拍の自動検出を、本物の曲で確かめる道具**(開発中だけ。`/beat-check`)。
 *
 * ■ 見せ方が確認の手段そのもの
 * 波形の上に方眼を重ねる。**蹴りの山と縦線が揃っていれば合っている**。
 * カウント軸の設計では「合っているか user に訊かない」ことにしたが、
 * それが成り立つのは**波形の上で目に見えるから**で、ここはその仕組みを
 * 先に試している。
 *
 * ■ 耳でも確かめられる
 * 再生すると、拍のところで印が動く。目で合っていても、鳴らすと
 * 半拍ずれていることがある。
 *
 * 文言は英語のまま。**user 向けの画面ではない**ので3言語へ足さない
 * (JSX の日本語直書きを塞ぐ ESLint にも当たらない)。
 */
export function BeatCheck() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [grid, setGrid] = useState<BeatGrid | null>(null);
  const [status, setStatus] = useState("Drop a song to analyse it.");
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [beatsPerSet, setBeatsPerSet] = useState(8);

  const analyse = async (file: File) => {
    setStatus(`Decoding ${file.name}…`);
    setGrid(null);
    setElapsedMs(null);

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

    if (!detected) {
      setStatus("No beat found.");
      return;
    }
    setGrid(detected);
    setStatus(`${file.name} — ${audio.durationSeconds.toFixed(1)}s`);
    draw(audio.samples, audio.sampleRate, detected, beatsPerSet);

    if (audioRef.current) audioRef.current.src = URL.createObjectURL(file);
  };

  /** 先頭の20秒だけ描く。全体を1枚に押し込むと縦線が潰れて確かめられない */
  const draw = (
    samples: Float32Array,
    sampleRate: number,
    detected: BeatGrid,
    perSet: number,
  ) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const shownSeconds = 20;
    const width = canvas.width;
    const height = canvas.height;
    context.clearRect(0, 0, width, height);

    /* 色は直書き。**この道具は捨てる前提**なのでトークンを足さない
       (canvas は class を当てられないので、本番の波形は CSS 変数を
       読んでいる。ここは試すためだけの絵) */
    context.fillStyle = "#8a8296";
    const perColumn = Math.floor((sampleRate * shownSeconds) / width);
    for (let column = 0; column < width; column += 1) {
      let peak = 0;
      const start = column * perColumn;
      for (let i = start; i < start + perColumn && i < samples.length; i += 1) {
        const value = Math.abs(samples[i]);
        if (value > peak) peak = value;
      }
      const barHeight = peak * height;
      context.fillRect(column, (height - barHeight) / 2, 1, barHeight);
    }

    // 拍の方眼。8カウントの頭だけ太く
    const beatSeconds = 60 / detected.bpm;
    const pxPerSecond = width / shownSeconds;
    let beat = 0;
    for (
      let time = detected.originSeconds;
      time < shownSeconds;
      time += beatSeconds
    ) {
      const isDownbeat = beat % perSet === 0;
      context.fillStyle = isDownbeat ? "#f0559b" : "rgba(240,85,155,0.35)";
      context.fillRect(Math.round(time * pxPerSecond), 0, isDownbeat ? 2 : 1, height);
      beat += 1;
    }
  };

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-4 p-6 text-fg">
      <h1 className="text-title">Beat detection check</h1>
      <p className="text-body text-fg-muted">
        Development tool. Pick a song and see whether the detected grid lines up
        with the kicks in the waveform (first 20 seconds shown).
      </p>

      <div className="flex items-center gap-4">
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
      </div>

      <p className="text-body">{status}</p>

      {grid && (
        <dl className="grid grid-cols-3 gap-4 rounded-lg border border-line bg-surface p-4 font-mono text-body">
          <div>
            <dt className="text-caption text-fg-muted">BPM</dt>
            <dd className="text-title">{grid.bpm}</dd>
          </div>
          <div>
            <dt className="text-caption text-fg-muted">First beat</dt>
            <dd className="text-title">{grid.originSeconds.toFixed(3)}s</dd>
          </div>
          <div>
            <dt className="text-caption text-fg-muted">Confidence</dt>
            <dd className="text-title">{grid.confidence.toFixed(2)}</dd>
          </div>
        </dl>
      )}

      <canvas
        ref={canvasRef}
        width={900}
        height={180}
        className="w-full rounded-lg border border-line bg-surface-sunken"
      />

      {/* 目で合っていても、鳴らすと半拍ずれていることがある */}
      <audio ref={audioRef} controls className="w-full" />

      {elapsedMs !== null && (
        <p className="text-caption text-fg-muted">
          Analysed in {elapsedMs} ms (the decode is not counted).
        </p>
      )}
    </main>
  );
}
