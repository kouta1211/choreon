"use client";

import { Music4 } from "lucide-react";
import { useMusicStore } from "@/features/music/store/useMusicStore";
import { useBpm } from "@/features/music/hooks/useBpm";
import { MAX_BPM, MIN_BPM } from "@/features/music/lib/metronomePreference";
import { Slider } from "@/components/ui/slider";
import { PressableButton } from "@/components/atoms/PressableButton";
import { useT } from "@/features/i18n/LocaleProvider";

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
  const t = useT();
  const { bpm, setBpm } = useBpm();
  const isEnabled = useMusicStore((state) => state.isMetronomeEnabled);
  const toggleMetronome = useMusicStore((state) => state.toggleMetronome);

  return (
    <div
      style={{ height: COUNT_CONTROLS_HEIGHT }}
      className="flex items-center gap-2.5"
    >
      <PressableButton
        role="switch"
        aria-checked={isEnabled}
        onClick={toggleMetronome}
        aria-label={t.music.click}
        className={`flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[calc(var(--radius)*0.5)] border transition-colors ${
          isEnabled
            ? "border-accent bg-accent/16 text-accent-soft"
            : "border-line-strong text-fg-muted"
        }`}
      >
        <Music4 size={13} />
      </PressableButton>

      <Slider
        aria-label={t.music.bpm}
        min={MIN_BPM}
        max={MAX_BPM}
        step={1}
        value={[bpm]}
        onValueChange={([next]) => setBpm(next)}
        className="min-w-0 flex-1"
      />

      <span className="w-[52px] shrink-0 text-right font-mono text-caption tabular-nums text-fg-sub">
        {bpm}
        <span className="ml-0.5 text-caption text-fg-muted">BPM</span>
      </span>
    </div>
  );
}
