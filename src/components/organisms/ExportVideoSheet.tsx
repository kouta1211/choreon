"use client";

import { useRef, useState } from "react";
import { Film } from "lucide-react";
import { BottomSheet } from "@/components/molecules/BottomSheet";
import { PressableButton } from "@/components/atoms/PressableButton";
import { Switch } from "@/components/atoms/Switch";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { DANCER_COLOR_PALETTE } from "@/features/dancer/constants";
import { recordFormationVideo } from "@/features/export/lib/recordVideo";
import {
  pickVideoFormat,
  videoFileName,
} from "@/features/export/lib/videoFormat";
import type { FrameColors } from "@/features/export/lib/drawFrame";
import type { Project } from "@/features/project/types";

type Props = {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
};

/** 高さで選ぶ。幅は 16:9 で決まる */
const SIZES = [
  { height: 720, label: "720p" },
  { height: 1080, label: "1080p" },
] as const;

/**
 * 隊形の動きを動画にして渡すシート。
 *
 * ■ リンクではなく動画で渡す場面
 * 共有リンクは「開いて自分で動かせる」もので、稽古中に確かめるのに向く。
 * 動画は、そのままグループに流せて、アプリを開かない人にも届く。
 * どちらが良いかではなく、渡す相手と場面が違う。
 *
 * ■ 書き出しには作品と同じだけ時間がかかる
 * Canvas の録画は実時間で進むので、3分の作品なら3分。仕組み上どうにも
 * ならないので、隠さずに書いて、残り時間を出す。
 *
 * ■ 音は入らない
 * 音源は端末から出さない方針のもの。動画に焼くと、その方針を回り込んで
 * 配ることになる。
 */
export function ExportVideoSheet({ project, isOpen, onClose }: Props) {
  const scenes = useProjectStore((state) => state.scenes);
  const dancers = useProjectStore((state) => state.dancers);
  const positionsBySceneId = useProjectStore(
    (state) => state.positionsBySceneId,
  );
  const showToast = useUIStore((state) => state.showToast);

  const [height, setHeight] = useState<number>(720);
  const [showNames, setShowNames] = useState(true);
  const [progress, setProgress] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const format = pickVideoFormat();
  const durationSeconds =
    scenes.length > 1
      ? scenes[scenes.length - 1].timeSeconds - scenes[0].timeSeconds
      : 0;

  const start = async () => {
    if (!format) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setProgress(0);

    try {
      const blob = await recordFormationVideo({
        scenes,
        positionsBySceneId,
        dancers,
        stageWidth: project.stageWidth,
        stageHeight: project.stageHeight,
        colors: resolveColors(),
        showNames,
        height,
        fps: 30,
        mimeType: format.mimeType,
        onProgress: setProgress,
        signal: controller.signal,
      });

      if (controller.signal.aborted) return;
      download(blob, videoFileName(project.title, format.extension));
      showToast({ message: "動画を保存しました", type: "success" });
      onClose();
    } catch {
      showToast({ message: "書き出しに失敗しました", type: "error" });
    } finally {
      abortRef.current = null;
      setProgress(null);
    }
  };

  const cancel = () => {
    abortRef.current?.abort();
    setProgress(null);
  };

  const isRunning = progress !== null;

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={isRunning ? cancel : onClose}
      title="動画にする"
    >
      <div className="flex flex-col gap-4 px-3.5 py-3">
        {!format ? (
          <p className="rounded-xl border border-line px-3 py-2.5 text-label leading-snug text-fg-muted">
            この端末のブラウザでは動画を書き出せません。パソコンの Chrome か、
            新しい iPhone の Safari でお試しください。
          </p>
        ) : scenes.length < 2 ? (
          <p className="rounded-xl border border-line px-3 py-2.5 text-label leading-snug text-fg-muted">
            シーンが2つ以上あると、その間の動きを動画にできます。
          </p>
        ) : (
          <>
            <div className="flex items-center gap-2.5">
              <span className="flex-1 text-label text-fg">大きさ</span>
              <div className="flex shrink-0 overflow-hidden rounded-[calc(var(--radius)*0.8333)] border border-line-strong">
                {SIZES.map((size) => (
                  <PressableButton
                    key={size.height}
                    aria-pressed={height === size.height}
                    disabled={isRunning}
                    onClick={() => setHeight(size.height)}
                    className={`h-8 min-w-11 px-2 font-mono text-label ${
                      height === size.height
                        ? "bg-accent/16 text-accent-soft"
                        : "text-fg-muted"
                    }`}
                  >
                    {size.label}
                  </PressableButton>
                ))}
              </div>
            </div>

            <Switch
              checked={showNames}
              onChange={() => setShowNames((value) => !value)}
              label="名前を出す"
              description="人数が多いときは、切ると隊形が読みやすくなります"
              fullWidth
            />

            {isRunning ? (
              <div className="flex flex-col gap-2">
                <div
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round((progress ?? 0) * 100)}
                  className="h-1.5 overflow-hidden rounded-full bg-line-strong"
                >
                  <span
                    style={{ width: `${Math.round((progress ?? 0) * 100)}%` }}
                    className="block h-full bg-accent transition-[width] duration-200"
                  />
                </div>
                <p className="text-caption text-fg-muted">
                  書き出し中… 残り{" "}
                  {Math.max(
                    0,
                    Math.ceil(durationSeconds * (1 - (progress ?? 0))),
                  )}
                  秒。この画面を閉じずにお待ちください。
                </p>
                <PressableButton
                  onClick={cancel}
                  className="h-11 rounded-xl border border-line-strong text-label text-fg-sub"
                >
                  中止する
                </PressableButton>
              </div>
            ) : (
              <PressableButton
                kind="primary"
                onClick={() => void start()}
                className="flex h-12 items-center justify-center gap-2 rounded-xl bg-accent text-[14px] font-semibold text-accent-fg"
              >
                <Film size={17} />
                {Math.ceil(durationSeconds)}秒の動画を作る
              </PressableButton>
            )}

            <p className="text-caption leading-snug text-fg-muted">
              書き出しには作品と同じだけ時間がかかります(実際に動かしながら
              録っているため)。音は入りません。
            </p>
          </>
        )}
      </div>
    </BottomSheet>
  );
}

/**
 * テーマのCSS変数を、Canvasが読める実測値に直す。
 *
 * Canvas は var(--accent) のような指定を解釈しないので、描く前に
 * getComputedStyle で解決しておく(ミニチュアを焼くときと同じ理由)。
 */
function resolveColors(): FrameColors {
  const style = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) =>
    style.getPropertyValue(name).trim() || fallback;

  const dancerColors = new Map<string, string>();
  DANCER_COLOR_PALETTE.forEach((color, index) => {
    dancerColors.set(color, read(`--dancer-${index + 1}`, color));
  });

  return {
    background: read("--bg", "#19191c"),
    stage: read("--stage", "#141417"),
    grid: read("--stage-grid", "#2c2c32"),
    line: read("--line-strong", "#3f3f46"),
    label: read("--text-muted", "#71717a"),
    dancer: (color) => dancerColors.get(color) ?? color,
  };
}

/** 端末へ保存する。作った Blob は使い終わったら解放する */
function download(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // すぐ剥がすと保存が始まらない端末がある
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
