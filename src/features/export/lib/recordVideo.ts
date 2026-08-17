"use client";

import {
  drawFrame,
  type FrameColors,
  type FrameDancer,
  type FrameOverlays,
} from "@/features/export/lib/drawFrame";
import {
  positionsAtSeconds,
  type PositionsBySceneId,
} from "@/features/viewer/lib/interpolate";
import { buildPaths, buildStageMarks } from "@/features/export/lib/exportOverlays";
import { findBlockedDancerIds } from "@/features/canvas/lib/blindSpot";
import { seekFreshAudio } from "@/features/music/lib/seekAudio";
import type { Scene } from "@/features/scene/types";

/**
 * 動画に何を重ねるか。**どれも既定は入れない。**
 *
 * 画面(表示とモード)の切り替えとは別に持つ。画面で導線を出していたから
 * といって動画にも焼かれると、渡した相手には線だらけの画面が届く
 * — 見せたいのが隊形だけのときが多い。
 */
export type ExportOverlayOptions = {
  showPaths: boolean;
  showStageMarks: boolean;
  showBlindSpots: boolean;
};

/**
 * 隊形の動きを動画にする。
 *
 * ■ 実時間で録る
 * Canvas の録画は「そのコマが画面に出た時刻」で並ぶ。速く描いても
 * 速い動画になるだけで、時間は縮まない。つまり【書き出しには作品と
 * 同じだけ時間がかかる】。3分の作品なら3分。これは仕組み上動かせないので、
 * 画面には進み具合と残り時間を出して、待つと分かる形にする。
 *
 * ■ 音は「入れる」を選べる(2026-08-18)
 * 長らく無音にしていた。理由は「音源は端末の中にしかなく、共有しない方針の
 * もの」だったが、それは**共有リンクの約束**の話。書き出した動画は
 * **user が自分の端末に保存する自分のファイル**で、誰に渡すかは user が決める。
 * リンクとは届く相手の決まり方が違うので、ここは分けた。
 * **共有リンクに曲が付いていかないことは変わらない。**
 *
 * 既定は入れない。入れるときだけ音声トラックを足す(下の attachAudio)。
 * 入るのは曲だけで、メトロノームのクリックは入らない
 * (あちらはスピーカーへ直接鳴らす作りで、録れる形になっていない)。
 */

export type RecordInput = {
  scenes: Scene[];
  positionsBySceneId: PositionsBySceneId;
  dancers: Record<string, FrameDancer>;
  stageWidth: number;
  stageHeight: number;
  colors: FrameColors;
  showNames: boolean;
  overlayOptions: ExportOverlayOptions;
  /** 出力の高さ(px)。幅は 16:9 で決まる */
  height: number;
  fps: number;
  mimeType: string;
  /**
   * 曲を入れるときだけ渡す。渡さなければ無音（これまでどおり）。
   *
   * `songSeconds` は**曲のどこから鳴らすか**。動画は先頭のシーンから始まる
   * ので、ふつうは作品の「頭出し」の値がそのまま入る。
   */
  audio?: { objectUrl: string; songSeconds: number };
  /** 0〜1。画面の進み具合に使う */
  onProgress?: (ratio: number) => void;
  signal?: AbortSignal;
};

/**
 * 曲を録画のストリームへ流し込む。
 *
 * ■ 共有の <audio> は借りない
 * 画面の再生に使っている要素（SceneDock）を借りると、**再生位置が飛んで
 * 隊形まで動く**。確かめたいのは音だけなので、ここだけの Audio を作って捨てる
 * （頭出しの試し聴き useOffsetPreview と同じ判断）。
 *
 * ■ スピーカーへは繋がない
 * `ctx.destination` へ繋がなければ、録音には入るが**手元では鳴らない**。
 * 3分の作品を書き出すたびに3分の曲が流れ出すのは邪魔なので、繋がない。
 *
 * @returns 後片付けの関数。中止・完了・失敗のどの道でも必ず呼ぶ
 */
async function attachAudio(
  stream: MediaStream,
  { objectUrl, songSeconds }: { objectUrl: string; songSeconds: number },
): Promise<() => void> {
  const element = new Audio(objectUrl);
  element.crossOrigin = "anonymous";
  /* 長さが分かってから送る。Chrome は読み込み前の代入も覚えてくれるが、
     Safari は取りこぼすことで知られる（iPhone で書き出す人が居る）。
     取りこぼすと曲の頭から鳴り、頭出しが黙って無視される。詳しくは seekAudio.ts */
  await seekFreshAudio(element, songSeconds);

  const context = new AudioContext();
  const source = context.createMediaElementSource(element);
  const destination = context.createMediaStreamDestination();
  source.connect(destination);

  const track = destination.stream.getAudioTracks()[0];
  if (track) stream.addTrack(track);

  const cleanup = () => {
    element.pause();
    element.src = "";
    track?.stop();
    void context.close();
  };

  try {
    await context.resume();
    // 鳴り始めてから録り始める。ここを待たないと出だしの数十msが無音になる
    await element.play();
  } catch {
    // 端末が音を出せない状態。**無音で書き出しを続ける**方が、
    // 途中まで待った時間を捨てるより良い
    cleanup();
    return () => {};
  }

  return cleanup;
}

export async function recordFormationVideo({
  scenes,
  positionsBySceneId,
  dancers,
  stageWidth,
  stageHeight,
  colors,
  showNames,
  overlayOptions,
  height,
  fps,
  mimeType,
  audio,
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

  /* バミリは時刻によらず同じなので、書き出しの前に1回だけ組む
     (判断は exportOverlays.ts。ここは canvas を触るので、テストから
     呼べる形にしておきたい部分だけ外へ出してある) */
  const marks = overlayOptions.showStageMarks
    ? buildStageMarks(positionsBySceneId)
    : undefined;

  /** その時刻に描く重ね物。導線と顔被りは時刻ごとに変わる */
  const overlaysAt = (seconds: number): FrameOverlays | undefined => {
    if (
      !overlayOptions.showPaths &&
      !overlayOptions.showStageMarks &&
      !overlayOptions.showBlindSpots
    ) {
      return undefined;
    }

    const overlays: FrameOverlays = { marks };

    if (overlayOptions.showPaths) {
      overlays.paths = buildPaths(
        scenes,
        positionsBySceneId,
        seconds,
        (dancerId) => {
          const dancer = dancers[dancerId];
          return dancer ? colors.dancer(dancer.color) : null;
        },
      );
    }

    return overlays;
  };

  // 1コマ目を先に描く。真っ黒から始まると、書き出しが始まったのか
  // 分からないまま数秒過ぎる
  const draw = (seconds: number) => {
    const positions = positionsAtSeconds(scenes, positionsBySceneId, seconds);
    const overlays = overlaysAt(seconds);
    if (overlays && overlayOptions.showBlindSpots) {
      // 顔被りは【その瞬間の立ち位置】で決まる。移動の途中で被ることも
      // あるので、シーンごとではなくコマごとに調べる
      overlays.blockedDancerIds = findBlockedDancerIds(
        Object.fromEntries(
          positions.map((p) => [
            p.dancerId,
            { xCoordinate: p.x, yCoordinate: p.y },
          ]),
        ),
      );
    }
    drawFrame(context, {
      width,
      height,
      stageWidth,
      stageHeight,
      positions,
      dancers,
      colors,
      showNames,
      clock: formatClock(seconds - fromSeconds),
      overlays,
    });
  };
  draw(fromSeconds);

  const stream = canvas.captureStream(fps);
  /* 曲を足すのは録画機を作る**前**。あとから addTrack しても、
     MediaRecorder はもう映像だけのストリームを見ている */
  const stopAudio = audio ? await attachAudio(stream, audio) : () => {};

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
      stopAudio();
      stream.getTracks().forEach((track) => track.stop());
      resolve(new Blob(chunks, { type: mimeType }));
    };
    recorder.onerror = () => {
      stopAudio();
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
  if (recorder.state !== "inactive") {
    recorder.stop();
  } else {
    // onstop が来ない道。**ここで止めないと曲が鳴り続ける**
    stopAudio();
  }

  return finished;
}

/** 0:12 の形。動画の隅に出す */
function formatClock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}
