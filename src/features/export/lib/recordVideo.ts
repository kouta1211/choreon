"use client";

import { drawFrame, type FrameColors, type FrameDancer } from "@/features/export/lib/drawFrame";
import { positionsAtSeconds, type PositionsBySceneId } from "@/features/viewer/lib/interpolate";
import type { Scene } from "@/features/scene/types";

/**
 * 隊形の動きを動画にする。
 *
 * ■ 実時間で録る
 * Canvas の録画は「そのコマが画面に出た時刻」で並ぶ。速く描いても
 * 速い動画になるだけで、時間は縮まない。つまり【書き出しには作品と
 * 同じだけ時間がかかる】。3分の作品なら3分。これは仕組み上動かせないので、
 * 画面には進み具合と残り時間を出して、待つと分かる形にする。
 *
 * ■ 音は入れない
 * 音源はこの端末の中にしかなく、そもそも共有しない方針のもの。
 * 動画に焼き込むと、その方針を回り込んで配ることになる。
 * 稽古で要るのは立ち位置と道順なので、無音のままにしてある。
 */

export type RecordInput = {
  scenes: Scene[];
  positionsBySceneId: PositionsBySceneId;
  dancers: Record<string, FrameDancer>;
  stageWidth: number;
  stageHeight: number;
  colors: FrameColors;
  showNames: boolean;
  /** 出力の高さ(px)。幅は 16:9 で決まる */
  height: number;
  fps: number;
  mimeType: string;
  /** 0〜1。画面の進み具合に使う */
  onProgress?: (ratio: number) => void;
  signal?: AbortSignal;
};

export async function recordFormationVideo({
  scenes,
  positionsBySceneId,
  dancers,
  stageWidth,
  stageHeight,
  colors,
  showNames,
  height,
  fps,
  mimeType,
  onProgress,
  signal,
}: RecordInput): Promise<Blob> {
  if (scenes.length === 0) throw new Error("シーンがありません");

  const fromSeconds = scenes[0].timeSeconds;
  const toSeconds = scenes[scenes.length - 1].timeSeconds;
  const duration = Math.max(0.1, toSeconds - fromSeconds);

  const width = Math.round((height * 16) / 9 / 2) * 2;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("この端末では書き出せません");

  // 1コマ目を先に描く。真っ黒から始まると、書き出しが始まったのか
  // 分からないまま数秒過ぎる
  const draw = (seconds: number) => {
    drawFrame(context, {
      width,
      height,
      stageWidth,
      stageHeight,
      positions: positionsAtSeconds(scenes, positionsBySceneId, seconds),
      dancers,
      colors,
      showNames,
      clock: formatClock(seconds - fromSeconds),
    });
  };
  draw(fromSeconds);

  const stream = canvas.captureStream(fps);
  const recorder = new MediaRecorder(stream, {
    mimeType,
    // 720p で見て粗くない程度。上げても隊形の読みやすさは変わらない
    videoBitsPerSecond: height >= 1080 ? 6_000_000 : 3_000_000,
  });

  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };

  const finished = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      resolve(new Blob(chunks, { type: mimeType }));
    };
    recorder.onerror = () => {
      stream.getTracks().forEach((track) => track.stop());
      reject(new Error("書き出しに失敗しました"));
    };
  });

  recorder.start();

  await new Promise<void>((resolve) => {
    const startedAt = performance.now();
    let frame = 0;

    const step = () => {
      if (signal?.aborted) {
        cancelAnimationFrame(frame);
        resolve();
        return;
      }

      const elapsed = (performance.now() - startedAt) / 1000;
      const seconds = Math.min(toSeconds, fromSeconds + elapsed);
      draw(seconds);
      onProgress?.(Math.min(1, elapsed / duration));

      if (elapsed >= duration) {
        resolve();
        return;
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
  });

  // 最後の隊形が一瞬で切れないよう、少しだけ持たせてから止める
  await new Promise((resolve) => setTimeout(resolve, 250));
  if (recorder.state !== "inactive") recorder.stop();

  return finished;
}

/** 0:12 の形。動画の隅に出す */
function formatClock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}
