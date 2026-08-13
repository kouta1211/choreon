"use client";

import { useBpm } from "@/features/music/hooks/useBpm";
import { PressableButton } from "@/components/atoms/PressableButton";

/**
 * 選べる拍子。3つに絞ってある(オーバーレイ仕様§6: セグメントは3つ以下)。
 *
 * 4は既定。3はワルツ系、6は8分の6拍子など「2拍3連で数える曲」。
 * これ以外の拍子は、数える単位(8カウント)の側が変わらない以上、
 * 実際に選ぶ場面が無い。
 */
const CHOICES = [4, 3, 6] as const;

/**
 * 作品の拍子。
 *
 * ■ 8カウントとは別のもの
 * 稽古場で数える単位は小節ではなく8カウントで、それは拍子とは無関係に
 * 8つ数える。だからセット番号も縞も、この値では変わらない。
 * この値が決めるのは【どの拍を強く鳴らすか】と、時間軸に引く拍線の
 * どれを太くするかの2つだけ。
 *
 * ■ なぜ作品が持つのか
 * BPMと同じ理由。音源は共有しないので、共有された相手の画面に出せる
 * 時間の手がかりは「シーンの時刻」と「BPM・拍子」しか無い。
 */
export function BeatsPerBarSegment() {
  const { beatsPerBar, setBeatsPerBar } = useBpm();

  return (
    <div
      role="group"
      aria-label="拍子"
      className="flex shrink-0 overflow-hidden rounded-[calc(var(--radius)*0.8333)] border border-line-strong"
    >
      {CHOICES.map((choice, index) => {
        const isOn = beatsPerBar === choice;
        return (
          <PressableButton
            key={choice}
            type="button"
            aria-pressed={isOn}
            onClick={() => setBeatsPerBar(choice)}
            className={`h-8 min-w-11 px-2 font-mono text-label transition-colors ${
              index < CHOICES.length - 1 ? "border-r border-line-strong" : ""
            } ${
              isOn ? "bg-accent/16 text-accent-soft" : "text-fg-muted"
            }`}
          >
            {choice}/4
          </PressableButton>
        );
      })}
    </div>
  );
}
