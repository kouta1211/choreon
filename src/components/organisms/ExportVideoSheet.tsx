"use client";

import { useRef, useState } from "react";
import { Film } from "lucide-react";
import { BottomSheet } from "@/components/molecules/BottomSheet";
import { PressableButton } from "@/components/atoms/PressableButton";
import { Switch } from "@/components/atoms/Switch";
import { SegmentedControl } from "@/components/atoms/SegmentedControl";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useMusicStore } from "@/features/music/store/useMusicStore";
import { DANCER_COLOR_PALETTE } from "@/features/dancer/constants";
import { recordFormationVideo } from "@/features/export/lib/recordVideo";
import {
  pickVideoFormat,
  videoFileName,
} from "@/features/export/lib/videoFormat";
import type { FrameColors } from "@/features/export/lib/drawFrame";
import type { Project } from "@/features/project/types";
import { useT } from "@/features/i18n/LocaleProvider";

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
 * ■ 音は「入れる」を選べる(2026-08-18)
 * 長らく無音にしていた理由は「音源は端末から出さない方針のもの」だったが、
 * それは**共有リンクの約束**の話。書き出した動画は user が自分の端末に
 * 保存する自分のファイルで、誰に渡すかは user が決める。
 * **共有リンクに曲が付いていかないことは変わらない。**
 *
 * 既定は入れない。曲が入っていない作品では、スイッチそのものを出さない。
 */
export function ExportVideoSheet({ project, isOpen, onClose }: Props) {
  const t = useT();
  const scenes = useProjectStore((state) => state.scenes);
  const dancers = useProjectStore((state) => state.dancers);
  const positionsBySceneId = useProjectStore(
    (state) => state.positionsBySceneId,
  );
  const showToast = useUIStore((state) => state.showToast);

  const [height, setHeight] = useState<number>(720);
  const [showNames, setShowNames] = useState(true);
  /**
   * 何を重ねるか。**既定はどれも入れない。**
   *
   * 画面で導線を出していたからといって動画にも焼かれると、渡した相手には
   * 線だらけの画面が届く。見せたいのが隊形だけのときが多いので、
   * ここで選ばせる（「オプションを設定する導線がほしい」への答え）。
   */
  const [showPaths, setShowPaths] = useState(false);
  const [showStageMarks, setShowStageMarks] = useState(false);
  const [showBlindSpots, setShowBlindSpots] = useState(false);
  /** 曲を入れるか。**既定は入れない**（重ねるものと同じ作法） */
  const [includeAudio, setIncludeAudio] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const musicUrl = useMusicStore((state) => state.objectUrl);
  const setIsPlaying = useUIStore((state) => state.setIsPlaying);

  /* 音を入れるときは、音声トラックを受ける形式でなければならない。
     受けない端末では null が返る → スイッチを出さない */
  const audioFormat = pickVideoFormat({ withAudio: true });
  const format = includeAudio ? audioFormat : pickVideoFormat();
  /** 曲が無い / 端末が音を録れない、どちらでもスイッチは出さない。
      押しても無音のスイッチは、壊れているのと区別が付かない */
  const canIncludeAudio = musicUrl !== null && audioFormat !== null;
  const durationSeconds =
    scenes.length > 1
      ? scenes[scenes.length - 1].timeSeconds - scenes[0].timeSeconds
      : 0;

  const start = async () => {
    if (!format) return;
    /* 画面の再生を止める。止めないと**2つの音が重なって聞こえる**
       （録音に入るのは書き出し側の音だけなので、混ざるのは耳だけ） */
    setIsPlaying(false);

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
        overlayOptions: { showPaths, showStageMarks, showBlindSpots },
        height,
        fps: 30,
        mimeType: format.mimeType,
        /* 動画は先頭のシーンから始まるので、曲の頭出しの位置が
           そのまま鳴らし始めの位置になる */
        audio:
          includeAudio && musicUrl
            ? {
                objectUrl: musicUrl,
                songSeconds: project.musicOffsetSeconds,
              }
            : undefined,
        onProgress: setProgress,
        signal: controller.signal,
      });

      if (controller.signal.aborted) return;
      download(blob, videoFileName(project.title, format.extension));
      showToast({ message: t.exportVideo.saved, type: "success" });
      onClose();
    } catch {
      showToast({ message: t.exportVideo.failed, type: "error" });
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
      title={t.exportVideo.title}
    >
      <div className="flex flex-col gap-gutter px-gutter py-gutter">
        {!format ? (
          <p className="rounded-xl border border-line px-3 py-2.5 text-label leading-snug text-fg-muted">
            {t.exportVideo.unsupported}

          </p>
        ) : scenes.length < 2 ? (
          <p className="rounded-xl border border-line px-3 py-2.5 text-label leading-snug text-fg-muted">
            {t.exportVideo.needsTwoScenes}
          </p>
        ) : (
          <>
            <div className="flex items-center gap-2.5">
              <span className="flex-1 text-label text-fg">
                {t.exportVideo.size}
              </span>
              {/* 3択以下の選び替えは、どの画面でも同じ形（SegmentedControl）。
                  以前はここだけ自前で枠を描いていた（実機報告 03-18） */}
              <SegmentedControl
                label={t.exportVideo.size}
                value={height}
                onChange={setHeight}
                options={SIZES.map((size) => ({
                  value: size.height,
                  label: size.label,
                }))}
                className="w-36 shrink-0"
              />
            </div>

            <Switch
              checked={showNames}
              onChange={() => setShowNames((value) => !value)}
              label={t.exportVideo.showNames}
              fullWidth
            />

            {/* 「入れるもの」を1つの束にする。**説明は付けない** —
                6個のスイッチに6行ぶら下げると、決めることより読むことの
                方が多くなる。既定が入れないことは、全部オフで並んでいる
                こと自体が言っている */}
            <div className="flex flex-col gap-1.5 border-t border-line pt-3.5">
              <p className="text-label text-fg">{t.exportVideo.includeTitle}</p>
              <Switch
                checked={showPaths}
                onChange={() => setShowPaths((value) => !value)}
                label={t.editor.view.path.label}
                fullWidth
              />
              <Switch
                checked={showStageMarks}
                onChange={() => setShowStageMarks((value) => !value)}
                label={t.editor.view.stageMarks.label}
                fullWidth
              />
              <Switch
                checked={showBlindSpots}
                onChange={() => setShowBlindSpots((value) => !value)}
                label={t.editor.view.blindSpot.label}
                fullWidth
              />
            </div>

            {/* 音は重ね物ではないので、別の区切りにする。
                曲が無い作品と、音を録れない端末では出さない */}
            {canIncludeAudio && (
              <div className="flex flex-col gap-2.5 border-t border-line pt-3.5">
                <p className="text-label text-fg">
                  {t.exportVideo.includeAudioTitle}
                </p>
                <Switch
                  checked={includeAudio}
                  onChange={() => setIncludeAudio((value) => !value)}
                  label={t.exportVideo.includeAudio}
                  description={t.exportVideo.includeAudioNote}
                  fullWidth
                />
                {/* 入れたときだけ出す。**渡す相手が変わる話**なので、
                    オフのときに読ませても意味が無い */}
                {includeAudio && (
                  <p className="text-caption leading-snug text-[var(--dancer-4)]">
                    {t.exportVideo.includeAudioWarning}
                  </p>
                )}
              </div>
            )}

            {/* 何が入って何が入らないかを、**押す前に**読ませる。
                「メトロノームや曲の音が出るのか、導線モードにした際に
                導線が出るのか」が分からない、という指摘への答え。
                書き出しには作品と同じだけ時間がかかるので、
                **録り終えてから違うと分かる**のがいちばん高くつく。
                だから**ボタンより先に置く**（以前はボタンの下にあった） */}
            <div className="flex flex-col gap-base text-caption leading-snug text-fg-muted">
              <p>{t.exportVideo.note}</p>
              <p>{t.exportVideo.contains}</p>
              <p>{t.exportVideo.omits}</p>
            </div>

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
                  {t.exportVideo.running(
                    Math.max(
                      0,
                      Math.ceil(durationSeconds * (1 - (progress ?? 0))),
                    ),
                  )}
                </p>
                <PressableButton
                  onClick={cancel}
                  className="h-11 rounded-xl border border-line-strong text-label text-fg-sub"
                >
                  {t.exportVideo.cancel}
                </PressableButton>
              </div>
            ) : (
              <PressableButton
                kind="primary"
                onClick={() => void start()}
                className="flex h-12 items-center justify-center gap-2 rounded-xl bg-accent text-body font-semibold text-accent-fg"
              >
                <Film size={17} />
                {t.exportVideo.start(Math.ceil(durationSeconds))}
              </PressableButton>
            )}
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
    // 紙・黒板系のテーマでは印を輪郭で描く。画面と同じ変数を読むので、
    // テーマを足しても書き出し側を直す必要はない
    markerFill: read("--marker-fill", "none"),
    markerStrokeWidth: Number(read("--marker-stroke-width", "0")) || 0,
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
