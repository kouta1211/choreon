"use client";

import { Music4 } from "lucide-react";
import { useBpm } from "@/features/music/hooks/useBpm";
import { MAX_BPM, MIN_BPM } from "@/features/music/lib/metronomePreference";
import { Slider } from "@/components/ui/slider";
import { PressableButton } from "@/components/atoms/PressableButton";
import { useT } from "@/features/i18n/LocaleProvider";
import { useMetronomeSetting } from "@/features/music/hooks/useMetronomeSetting";

/** 押すだけで置ける速さ。バラード〜アップテンポの目安 */
const PRESETS = [90, 110, 128, 140];

/**
 * 曲を入れていないときの、拍の操作。
 *
 * 曲があるときはそちらが時間の物差しになるが、無いときは何も無い。
 * 「何秒で移動するか」は数字としては入るものの、実際にその速さが
 * 速いのか遅いのかは、耳で聞かないと分からない。拍を鳴らせば、
 * 曲を用意する前でも振付の速さを体で確かめられる。
 *
 * 曲が入っている間は出さない。2つの拍が同時に鳴っても、どちらに
 * 合わせればよいのか分からなくなる。
 */
export function MetronomeControls() {
  const t = useT();
  const { bpm, setBpm } = useBpm();
  /* メトロノームは作品の設定になった(2026-08-18)。端末ごとではない */
  const { isMetronomeEnabled: isEnabled, toggleMetronome } =
    useMetronomeSetting();

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2.5">
        <PressableButton
          role="switch"
          aria-checked={isEnabled}
          onClick={toggleMetronome}
          className={`flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-label font-medium transition-colors ${
            isEnabled
              ? "border-accent bg-accent/12 text-accent-soft"
              : "border-line-strong text-fg-sub"
          }`}
        >
          <Music4 size={14} className="shrink-0" />
          {t.music.metronome}
        </PressableButton>

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Slider
            aria-label="BPM"
            min={MIN_BPM}
            max={MAX_BPM}
            step={1}
            value={[bpm]}
            onValueChange={([next]) => setBpm(next)}
            className="min-w-0 flex-1"
          />
          <span className="w-14 shrink-0 text-right font-mono text-label tabular-nums text-fg">
            {bpm}
            <span className="ml-0.5 text-caption text-fg-muted">BPM</span>
          </span>
        </div>
      </div>

      {/* 数字だけだと、速いのか遅いのかの見当が付かない。よく使う値を置く */}
      <div className="flex flex-wrap items-center gap-1.5">
        {PRESETS.map((preset) => (
          <PressableButton
            key={preset}
            type="button"
            aria-pressed={bpm === preset}
            onClick={() => setBpm(preset)}
            className={`h-7 rounded-full border px-2.5 font-mono text-caption transition-colors ${
              bpm === preset
                ? "border-accent bg-accent/14 text-accent-soft"
                : "border-line-strong text-fg-sub"
            }`}
          >
            {preset}
          </PressableButton>
        ))}
      </div>
    </div>
  );
}
