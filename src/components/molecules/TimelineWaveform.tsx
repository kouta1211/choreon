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
import { beatWindows } from "@/features/music/lib/beatWindows";
import type { Placement } from "@/features/music/lib/placement";

type Props = {
  /** 曲の山の列。読み込み中や曲が無いときは null */
  waveform: Waveform | null;
  /** 軸の左端(px)。ここが動いたら描き直す */
  scrollX: MotionValue<number>;
  /** **作品の頭(0秒)**が軸の何pxにあるか。帯とミニマップで縮尺が違うので、
   * 先頭の余白も縮尺に合わせて渡してもらう。
   * 曲の頭ではない — 頭出し(`musicOffsetSeconds`)を入れると両者はずれる */
  originPx: number;
  pxPerSecond: number;
  width: number;
  height: number;
  /** ここより手前を「再生済み」の色で塗る。塗らないなら null */
  playheadSeconds: MotionValue<number> | null;
  /**
   * 拍のグリッドの物差し。**速さと原点の両方がここから出る。**
   * 敷かないなら null。
   *
   * ⚠️ **速さ（BPM）と原点を別々に受けない**（2026-09-15）。曲が変わる
   * 作品では両方が区切りごとに変わるので、1組で受けると2曲目から
   * 縞も拍線もずれる。しかも等間隔のまま出るので**画面では読めない**。
   * 区間ごとに割るのは `beatWindows` の仕事。
   *
   * 参照が毎回変わると Canvas を描き直し続けるので、**ストアから
   * そのまま渡す**（`sections()` の戻り値のような作り直す配列を渡さない）。
   */
  placements: readonly Placement[] | null;
  /** **軸の秒 → 曲の秒**の差。`musicOffsetSeconds` そのもの。
   * 波形は曲の頭から復号してあるので、引くときだけこれを足す。
   * **拍の側には一切効かせない**(拍は作品の時間で数える) */
  songOffsetSeconds?: number;
  /** 何拍ごとに強拍(太い線)を引くか。作品の拍子。
   * 稽古場で数える単位は8カウントだが、それは拍子とは別の話で、
   * 線の太さを決めるのはこちら */
  /** 何拍ごとに線を太くするか。**null なら太い線を引かない**
   *  （曲があるときは拍子そのものを持たない。2026-08-22） */
  beatsPerBar?: number | null;
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
  placements,
  songOffsetSeconds = 0,
  beatsPerBar = null,
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
     *
     * ■ 区切りごとに引き直す（2026-09-15）
     * 曲が変わると「1拍が何秒か」と「1拍目がどこか」の両方が変わる。
     * 窓を `beatWindows` で割り、区間ごとにその物差しで描く。
     * **縞は窓の内側で切る** — 切らないと次の曲の地へはみ出す。
     */
    const drawCounts = (
      context: CanvasRenderingContext2D,
      view: { fromSeconds: number; toSeconds: number },
      /** 濃さ。波形の上に敷くときは薄くする（主役は波形） */
      strength: number,
    ) => {
      if (!placements) return;
      const x = (seconds: number) => (seconds - view.fromSeconds) * pxPerSecond;

      for (const band of beatWindows(
        placements,
        view.fromSeconds,
        view.toSeconds,
      )) {
        const setSeconds = secondsPerBeat(band.bpm) * BEATS_PER_SET;
        const firstSet = Math.floor(
          Math.max(0, band.fromSeconds - band.originSeconds) / setSeconds,
        );
        const lastSet = Math.ceil(
          (band.toSeconds - band.originSeconds) / setSeconds,
        );
        /* 通算のセット番号で偶奇を決める。区間ごとに 0 から数えると、
           区切りをまたぐ所で縞の明暗が反転して段差に見える */
        const setOffset = Math.floor(band.fromBeat / BEATS_PER_SET);

        // 1. 8カウントごとの縞。交互に薄く塗る
        context.fillStyle = `rgba(${ink}, ${0.03 * strength})`;
        for (let set = firstSet; set <= lastSet; set += 1) {
          if ((setOffset + set) % 2 !== 0) continue;
          const start = band.originSeconds + set * setSeconds;
          const left = Math.max(start, band.fromSeconds);
          const right = Math.min(start + setSeconds, band.toSeconds);
          if (right <= left) continue;
          context.fillRect(x(left), 0, (right - left) * pxPerSecond, height);
        }

        // 2. 拍線。潰れて灰色の面になる細かさでは描かない
        if (shouldDrawBeatLines(band.bpm, pxPerSecond)) {
          for (const beat of beatTimesInWindow(
            band.bpm,
            Math.max(0, band.fromSeconds),
            band.toSeconds,
            band.originSeconds,
          )) {
            const isBar =
              beatsPerBar !== null &&
              isDownbeat(beat, band.bpm, band.originSeconds, beatsPerBar);
            context.fillStyle = `rgba(${ink}, ${(isBar ? 0.13 : 0.05) * strength})`;
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
          context.fillStyle = `rgba(${ink}, ${0.34 * strength})`;
          context.font = '9px ui-monospace, SFMono-Regular, Menlo, monospace';
          context.textBaseline = "top";
          for (let set = Math.max(0, firstSet); set <= lastSet; set += 1) {
            const start = band.originSeconds + set * setSeconds;
            if (start < 0 || start < band.fromSeconds) continue;
            if (start >= band.toSeconds) continue;
            context.fillText(
              String(setOffset + set + 1),
              Math.round(x(start)) + 3,
              3,
            );
          }
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

      const window = {
        fromSeconds,
        toSeconds: fromSeconds + width / pxPerSecond,
      };

      // 曲が無いときはカウントの地。波形の代わりに置くもので、
      // 「機能が欠けた画面」ではなく「カウントで組む画面」にする
      if (!waveform) {
        drawCounts(context, window, 1);
        return;
      }

      /* **曲が入ってもカウントの地は敷く**（2026-08-26）。
         振付はカウントで組むので、波形の上でも「いま何セット目か」が
         読めなければならない。ただし主役は波形なので薄くして、
         波形より先に(下に)描く */
      drawCounts(context, window, 0.5);

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
        // 軸は【作品の時間】。波形は【曲の時間】で持っているので、
        // 引くときだけ頭出しを足す。ここを足さないと、頭出しを入れた
        // 作品で**聞こえている音と波形がずれる**
        const songAt = songOffsetSeconds + fromSeconds + x * secondsPerPixel;
        if (songAt < 0 || songAt > waveform.durationSeconds) continue;

        const peak = peakBetween(waveform, songAt, songAt + secondsPerPixel);
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
    placements,
    songOffsetSeconds,
    beatsPerBar,
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
