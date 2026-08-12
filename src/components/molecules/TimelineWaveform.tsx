"use client";

import { useEffect, useRef } from "react";
import type { MotionValue } from "motion/react";
import { useThemeStore } from "@/features/theme/store/useThemeStore";
import {
  beatTimesInWindow,
  isDownbeat,
  secondsPerBeat,
} from "@/features/music/lib/metronome";
import {
  BEATS_PER_SET,
  shouldDrawBeatLines,
} from "@/features/music/lib/counts";
import { peakBetween, type Waveform } from "@/features/music/lib/waveformPeaks";

type Props = {
  /** 曲の山の列。読み込み中や曲が無いときは null */
  waveform: Waveform | null;
  /** 軸の左端(px)。ここが動いたら描き直す */
  scrollX: MotionValue<number>;
  /** 曲の頭(0秒)が軸の何pxにあるか。帯とミニマップで縮尺が違うので、
   * 先頭の余白も縮尺に合わせて渡してもらう */
  originPx: number;
  pxPerSecond: number;
  width: number;
  height: number;
  /** ここより手前を「再生済み」の色で塗る。塗らないなら null */
  playheadSeconds: MotionValue<number> | null;
  /** 曲が無いときに敷く拍のグリッド。曲があるなら null */
  bpm: number | null;
  /** 1拍目がどこか(曲の頭出しのオフセット) */
  originSeconds: number;
  /** セット番号を出すか。ミニマップでは細かすぎて読めない */
  showSetNumbers?: boolean;
  /** 全体を薄くする。ミニマップで使う */
  opacity?: number;
  className?: string;
};

/**
 * 時間軸の【地】を描くCanvas。波形か、曲が無いときは拍のグリッド。
 *
 * ■ なぜCanvasなのか
 * 1pxごとに縦棒を置くと、390pxの帯でも390個のDOMになる。スクロールや
 * ピンチのたびにその全部が動くので、DOMでは追い付かない。
 *
 * ■ なぜスクロール位置をMotionValueで受けるのか
 * 指を動かしている間、左端の位置は毎フレーム変わる。これをReactのstateに
 * 置くと、時間軸の中身(コマ・旗・束ね)まで毎フレーム作り直すことになる。
 * MotionValueで受けて、変化したときにCanvasだけを描き直す。
 * ステージ上のダンサーや導線と同じ方針。
 *
 * ■ なぜ色をここで読むのか
 * テーマが10種類あり、色はすべてCSS変数に入っている。Canvasは変数を
 * 解釈しないので、描く直前に getComputedStyle で【解決済みの値】を
 * 取り出す。テーマを切り替えたら描き直す必要があるため、テーマの選択
 * そのものを依存に入れている。
 *
 * ■ 見えている範囲だけ描く
 * 曲全体をCanvasにすると、3分の曲を120px/秒で描いたとき21600px幅になり、
 * ブラウザのCanvas上限に当たる。ここでは常に窓の幅ぶんだけを持ち、
 * スクロールに合わせて中身を描き直している。
 */
export function TimelineWaveform({
  waveform,
  scrollX,
  originPx,
  pxPerSecond,
  width,
  height,
  playheadSeconds,
  bpm,
  originSeconds,
  showSetNumbers = false,
  opacity = 1,
  className,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // テーマを変えたら色を読み直す。preference そのものを見ているので、
  // プロジェクト単位の上書きを切り替えたときも追従する
  const themePreference = useThemeStore((state) => state.preference);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width <= 0 || height <= 0 || pxPerSecond <= 0) return;

    // 端末の画素密度に合わせる。等倍のままだと細い線がにじむ
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);

    const context = canvas.getContext("2d");
    if (!context) return;

    const styles = getComputedStyle(canvas);
    const idle = styles.getPropertyValue("--line-strong").trim();
    const played = styles.getPropertyValue("--accent-soft").trim();
    const ink = parseInk(styles.getPropertyValue("--texture-ink"));

    /**
     * カウントの地。8カウントごとの縞・拍線・セット番号の3層。
     *
     * ■ 縞がいちばん大事
     * これが無いと無地の帯を指で払うことになり、【どれだけ動いたか】が
     * 分からない。波形が担っていた手がかりの役目を、ここが引き継ぐ。
     */
    const drawCounts = (
      context: CanvasRenderingContext2D,
      { fromSeconds, toSeconds }: { fromSeconds: number; toSeconds: number },
    ) => {
      if (!bpm) return;
      const setSeconds = secondsPerBeat(bpm) * BEATS_PER_SET;
      const x = (seconds: number) => (seconds - fromSeconds) * pxPerSecond;

      // 1. 8カウントごとの縞。交互に薄く塗る
      const firstSet = Math.floor(
        Math.max(0, fromSeconds - originSeconds) / setSeconds,
      );
      const lastSet = Math.ceil((toSeconds - originSeconds) / setSeconds);
      context.fillStyle = `rgba(${ink}, 0.03)`;
      for (let set = firstSet; set <= lastSet; set += 1) {
        if (set % 2 !== 0) continue;
        const start = originSeconds + set * setSeconds;
        context.fillRect(x(start), 0, setSeconds * pxPerSecond, height);
      }

      // 2. 拍線。潰れて灰色の面になる細かさでは描かない
      if (shouldDrawBeatLines(bpm, pxPerSecond)) {
        for (const beat of beatTimesInWindow(
          bpm,
          Math.max(0, fromSeconds),
          toSeconds,
          originSeconds,
        )) {
          const isBar = isDownbeat(beat, bpm, originSeconds);
          context.fillStyle = `rgba(${ink}, ${isBar ? 0.13 : 0.05})`;
          context.fillRect(
            Math.round(x(beat)),
            isBar ? 0 : height * 0.25,
            1,
            isBar ? height : height * 0.5,
          );
        }
      }

      // 3. セット番号。小節番号ではなく、稽古場で数える単位の番号
      if (showSetNumbers && setSeconds * pxPerSecond >= 34) {
        context.fillStyle = `rgba(${ink}, 0.34)`;
        context.font = '9px ui-monospace, SFMono-Regular, Menlo, monospace';
        context.textBaseline = "top";
        for (let set = Math.max(0, firstSet); set <= lastSet; set += 1) {
          const start = originSeconds + set * setSeconds;
          if (start < 0) continue;
          context.fillText(String(set + 1), Math.round(x(start)) + 3, 3);
        }
      }

      // 4. 再生済みの側。波形のときの塗り分けにあたるもの
      if (playheadSeconds !== null) {
        const playedX = x(playheadSeconds.get());
        if (playedX > 0) {
          context.fillStyle = `color-mix(in oklab, ${played} 7%, transparent)`;
          context.fillRect(0, 0, Math.min(width, playedX), height);
        }
      }
    };

    const draw = () => {
      const fromSeconds = (scrollX.get() - originPx) / pxPerSecond;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);

      // 曲が無いときはカウントの地。波形の代わりに置くもので、
      // 「機能が欠けた画面」ではなく「カウントで組む画面」にする
      if (!waveform) {
        if (bpm) drawCounts(context, { fromSeconds, toSeconds: fromSeconds + width / pxPerSecond });
        return;
      }

      const center = height / 2;
      // 上下いっぱいまで振らせない。帯の縁で頭打ちになると、
      // そこから先の大小が読めなくなる
      const half = center * 0.92;
      const secondsPerPixel = 1 / pxPerSecond;
      const playedX =
        playheadSeconds === null
          ? -1
          : (playheadSeconds.get() - fromSeconds) * pxPerSecond;

      for (let x = 0; x < width; x += 1) {
        const at = fromSeconds + x * secondsPerPixel;
        if (at < 0 || at > waveform.durationSeconds) continue;

        const peak = peakBetween(waveform, at, at + secondsPerPixel);
        // 無音の箇所でも軸が途切れて見えないよう、最低1pxは残す
        const barHeight = Math.max(1, peak * half);
        context.fillStyle = x < playedX ? played : idle;
        context.fillRect(x, center - barHeight, 1, barHeight * 2);
      }
    };

    draw();
    const stopScroll = scrollX.on("change", draw);
    const stopPlayhead = playheadSeconds?.on("change", draw);
    return () => {
      stopScroll();
      stopPlayhead?.();
    };
  }, [
    waveform,
    scrollX,
    originPx,
    pxPerSecond,
    width,
    height,
    playheadSeconds,
    bpm,
    originSeconds,
    showSetNumbers,
    themePreference,
  ]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{ width, height, opacity }}
      className={className}
    />
  );
}

/**
 * `--texture-ink` は「255 255 255」のような3つ組で入っている。
 * Canvas は rgb(var(--x)) を解釈しないので、数字だけ取り出して組み直す。
 * 読めなければ白に落とす(暗いテーマが既定のため)。
 */
function parseInk(raw: string): string {
  const numbers = raw.trim().split(/[\s,]+/).filter(Boolean);
  if (numbers.length < 3) return "255, 255, 255";
  return numbers.slice(0, 3).join(", ");
}
