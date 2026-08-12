"use client";

import { Music4 } from "lucide-react";
import { useMusicStore } from "@/features/music/store/useMusicStore";
import { useBpm } from "@/features/music/hooks/useBpm";
import { MAX_BPM, MIN_BPM } from "@/features/music/lib/metronomePreference";

/** ミニマップと同じ段。倍率が変わっても段の高さが動かないようにする */
export const COUNT_CONTROLS_HEIGHT = 34;

/**
 * 曲が入っていないときの、時間軸の下に出る操作。速さと、拍を鳴らすか。
 *
 * ■ なぜ曲があるときは出さないのか
 * 曲があるときは曲が時間の物差しで、拍を鳴らす必要も無い(2つの拍が
 * 同時に鳴ると、どちらに合わせればよいのか分からなくなる)。
 * BPM そのものは曲があるときも意味を持つ — カウントの表示に使う — ので
 * 消えるわけではなく、置き場所が曲のシートへ移るだけ。
 *
 * ■ なぜミニマップと同じ段なのか
 * 縦の余白がいちばん貴重なので、段を増やさない。曲が無いときは
 * ミニマップに描く波形も無いため、その場所をそのまま使う。
 *
 * ■ 速さを変えてもコマは動かない
 * 時間軸の尺度は秒のまま固定してあり、拍は BPM から出した位置に線を
 * 引いているだけ。BPM を変えるとセット番号の見え方だけが変わる
 * (counts.ts)。
 */
export function CountControls() {
  const { bpm, setBpm } = useBpm();
  const isEnabled = useMusicStore((state) => state.isMetronomeEnabled);
  const toggleMetronome = useMusicStore((state) => state.toggleMetronome);

  return (
    <div
      style={{ height: COUNT_CONTROLS_HEIGHT }}
      className="flex items-center gap-2.5"
    >
      <button
        type="button"
        role="switch"
        aria-checked={isEnabled}
        onClick={toggleMetronome}
        aria-label="クリックを鳴らす"
        className={`flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[calc(var(--radius)*0.5)] border transition-colors ${
          isEnabled
            ? "border-accent bg-accent/16 text-accent-soft"
            : "border-line-strong text-fg-muted"
        }`}
      >
        <Music4 size={13} />
      </button>

      <label className="flex min-w-0 flex-1 items-center gap-2">
        <span className="sr-only">速さ(BPM)</span>
        <input
          type="range"
          min={MIN_BPM}
          max={MAX_BPM}
          step={1}
          value={bpm}
          onChange={(event) => setBpm(Number(event.target.value))}
          className="min-w-0 flex-1 accent-[var(--accent)]"
        />
      </label>

      <span className="w-[52px] shrink-0 text-right font-mono text-[11px] tabular-nums text-fg-sub">
        {bpm}
        <span className="ml-0.5 text-[9px] text-fg-muted">BPM</span>
      </span>
    </div>
  );
}
