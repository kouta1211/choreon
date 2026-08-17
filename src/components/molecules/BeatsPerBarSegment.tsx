"use client";

import { useBpm } from "@/features/music/hooks/useBpm";
import { SegmentedControl } from "@/components/atoms/SegmentedControl";
import { useT } from "@/features/i18n/LocaleProvider";

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
  const t = useT();
  const { beatsPerBar, setBeatsPerBar } = useBpm();

  return (
    /* 見た目は「ダンサー名」などの3択と共通(SegmentedControl)。
       以前はここだけ自前で枠を描いていて、**同じ意味のものが画面によって
       違う見え方**をしていた（実機報告 03-18「すべてこれで実装して」）。
       等幅で明るい面が滑るのも、他の3択と同じになる */
    <SegmentedControl
      label={t.music.beatsPerBar}
      value={beatsPerBar}
      onChange={setBeatsPerBar}
      options={CHOICES.map((choice) => ({
        value: choice,
        label: `${choice}/4`,
      }))}
      className="w-40 shrink-0"
    />
  );
}
