"use client";

import { useState } from "react";
import { Hand, Pause, Play } from "lucide-react";
import { PressableButton } from "@/components/atoms/PressableButton";
import { tapTempo } from "@/features/music/lib/tapTempo";
import { TAP_PATTERN, vibrate } from "@/lib/haptics";
import { useT } from "@/features/i18n/LocaleProvider";

/** 抱えておく叩いた回数の上限。真ん中の値を採るのに、これ以上は要らない */
const MAX_KEPT_TAPS = 16;

type Props = {
  /** 速さが出たとき。**出た回だけ**呼ぶ（1回目は呼ばない） */
  onMeasured: (bpm: number) => void;
  /**
   * 読み上げ用の名前。**画面に出る字は変えない**。
   *
   * 区切りごとに1つずつ置くと、同じ名前のボタンが並ぶ。
   * 目で見ている人には「その行のもの」と分かるが、**読み上げでは
   * 区別が付かない**ので、どの区間のものかをここで足す。
   */
  ariaLabel?: string;
  /**
   * 曲を鳴らす / 止める。**渡さなければボタンを出さない**。
   *
   * ここは molecule なのでストアに触らない（`.claude/rules/frontend.md`
   * 1節）。再生しているかどうかは、呼び出し側（organism）が渡す。
   */
  isPlaying?: boolean;
  onTogglePlay?: () => void;
};

/**
 * **曲に合わせて叩くと、その速さになる**（2026-09-25）。
 *
 * ■ なぜ叩く側なのか
 * 波形からの自動推定は、半分・2倍を取り違えるしリズムの薄い曲では外す。
 * 叩くのは **user が聞いて数えた速さそのもの**なので必ず当たり、
 * 曲を入れていない作品でも、スピーカーから流れている音でも使える。
 *
 * ■ 測り直しのボタンは置かない
 * 間があけば、その前は自動で捨てられる（`tapTempo` の `MAX_TAP_GAP_MS`）。
 * 手を止めてもう一度叩き始める、がそのまま測り直しになるので、
 * **覚える操作を増やさない**。
 *
 * ■ Space を再生と取り合わない
 * このボタンに焦点があるとき、Space は**叩く**方だけに効かせる。
 * board 側の Space（再生/停止）は板が開いていても効くので、
 * 止めないと1回の打鍵で2つ起きる。**曲を流しながら叩けること自体は
 * 残したい**ので、塞ぐのはこのボタンの上だけ。
 */
export function TapTempoButton({
  onMeasured,
  ariaLabel,
  isPlaying = false,
  onTogglePlay,
}: Props) {
  const t = useT();
  const [taps, setTaps] = useState<number[]>([]);
  const [reading, setReading] = useState<{
    bpm: number | null;
    taps: number;
  }>({ bpm: null, taps: 0 });

  const tap = () => {
    // 単調に進む時計を使う。壁時計は途中で飛ぶことがある
    const next = [...taps, performance.now()].slice(-MAX_KEPT_TAPS);
    setTaps(next);

    const measured = tapTempo(next);
    setReading(measured);
    if (measured.bpm !== null) onMeasured(measured.bpm);

    vibrate(TAP_PATTERN);
  };

  return (
    <div className="flex items-center gap-unit">
      {/* **板の中で曲を鳴らせるようにする**（2026-09-25）。

          曲のシートは画面全体を覆う板（`aria-modal`）なので、開いている
          間は下のバーの再生ボタンが押せない。「曲に合わせて叩く」と
          書いてあるのに**叩く相手を鳴らせなかった**（user の報告
          「いまいち使い方がわかりません」）。

          押しているのは**下のバーと同じ1つの口**（`requestTogglePlay`）で、
          再生の仕組みは増えていない */}
      {onTogglePlay && (
        <PressableButton
          type="button"
          aria-label={isPlaying ? t.music.tapPause : t.music.tapPlay}
          onClick={onTogglePlay}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line text-fg-strong"
        >
          {isPlaying ? (
            <Pause size={15} aria-hidden />
          ) : (
            <Play size={15} aria-hidden />
          )}
        </PressableButton>
      )}

      <PressableButton
        type="button"
        aria-label={ariaLabel}
        onClick={tap}
        onKeyDown={(event) => {
          if (event.key === " " || event.code === "Space") {
            // 再生の Space へ渡さない（1回の打鍵で2つ起こさない）
            event.stopPropagation();
          }
        }}
        className="flex items-center gap-1.5 rounded-lg border border-line px-gutter py-unit text-label text-fg-strong"
      >
        <Hand size={15} aria-hidden />
        {t.music.tapTempo}
      </PressableButton>

      {/* 回数と、いま出ている速さ。**ボタンの名前には入れない** —
          読み上げの名前が押すたびに変わると、何のボタンか分からなくなる */}
      <span
        aria-live="polite"
        className="min-w-0 flex-1 truncate text-caption text-fg-muted"
      >
        {reading.taps === 0
          ? t.music.tapTempoNote
          : t.music.tapTempoCount(reading.taps)}
      </span>
    </div>
  );
}
