"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import type { EventData, Step } from "react-joyride";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import {
  hasSeenTutorial,
  markTutorialSeen,
} from "@/features/tutorial/lib/tutorialPreference";
import { useT } from "@/features/i18n/LocaleProvider";
import type { Messages } from "@/features/i18n/messages";

/**
 * ライブラリごと遅延させる。案内は初回の1度しか使わないので、
 * 常に読み込むと、その1度のために全員が毎回ぶんの重さを払うことになる。
 */
const Joyride = dynamic(
  () => import("react-joyride").then((module) => module.Joyride),
  { ssr: false },
);

/**
 * 初めて開いた人へ出す使い方の案内。
 *
 * ■ 説明用の画面を作らない
 * 案内のためだけの偽のUIを置くと、案内の中と本物とで見た目や置き場所が
 * ずれていき、いずれ「案内どおりに触ると違う場所にある」状態になる。
 * 本物の要素を指すので、UIを直せば案内も一緒に正しくなる。
 *
 * ■ 指す先は data-tour で持つ
 * クラス名を目印にすると、見た目を整える過程で消える。案内が指すために
 * 存在する属性を別に付けて、消してよいものと区別する。
 *
 * ■ いつでも飛ばせる
 * 使い方が分かっている人に読ませない。飛ばしても「見た」として扱い、
 * 二度と自動では出さない(もう一度見る道は表示メニューに置く)。
 */
function steps(t: Messages): Step[] {
  return [
  {
    target: '[data-tour="stage"]',
    title: t.tour.stageTitle,
    content:
      t.tour.stageBody,
    placement: "bottom",
  },
  {
    target: '[data-tour="timeline"]',
    title: t.tour.timelineTitle,
    content:
      t.tour.timelineBody,
    placement: "top",
  },
  {
    target: '[data-tour="add-scene"]',
    title: t.tour.addTitle,
    content:
      t.tour.addBody,
    placement: "top",
  },
  {
    target: '[data-tour="display-menu"]',
    title: t.tour.viewTitle,
    content:
      t.tour.viewBody,
    placement: "bottom",
    },
  ];
}

export function EditorTour() {
  const t = useT();
  // 言語が変わったら作り直す。案内の中身は辞書が持つ
  const tourSteps = useMemo(() => steps(t), [t]);
  // 初回だけ自動で出す。読み込み直後は指す先がまだ描かれていないので、
  // 少し待ってから始める
  const [isAutoStarted, setAutoStarted] = useState(false);
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  const tourRequestedAt = useUIStore((state) => state.tourRequestedAt);

  useEffect(() => {
    if (hasSeenTutorial()) return;
    const timer = setTimeout(() => setAutoStarted(true), 500);
    return () => clearTimeout(timer);
  }, []);

  // 表示メニューから頼まれたら、見たかどうかに関わらず出す。
  // 「頼まれた時刻」が「閉じた時刻」より新しければ動いている、と読む
  // (effect の中で state を書き戻さずに済む)
  const isRunning =
    (tourRequestedAt !== null && tourRequestedAt !== dismissedAt) ||
    (isAutoStarted && dismissedAt === null);

  /**
   * 終わりを拾うのは `tour:end`。`tour:status` は状態が変わるたびに
   * 流れてきて、終わったあとには "ready"(次に備えた待機)が来るので、
   * そちらを見ていると終了を取り逃がす。
   *
   * 最後まで見ても飛ばしても「見た」として扱う。分かっている人に
   * 二度と自動で出さないため。
   */
  const handleEvent = (data: EventData) => {
    if (data.type !== "tour:end") return;
    if (data.status === "finished" || data.status === "skipped") {
      markTutorialSeen();
      setDismissedAt(tourRequestedAt ?? Date.now());
    }
  };

  if (!isRunning) return null;

  return (
    <Joyride
      steps={tourSteps}
      run
      continuous
      onEvent={handleEvent}
      locale={{
        back: t.tour.back,
        close: t.tour.close,
        last: t.tour.last,
        next: t.tour.next,
        // 進み具合を出すときは、こちらが使われる
        nextWithProgress: t.tour.nextWithProgress,
        skip: t.tour.skip,
      }}
      options={{
        buttons: ["back", "primary", "skip"],
        showProgress: true,
        skipScroll: true,
        // 合図の丸を置かずに、いきなり吹き出しを出す。
        // 自動で始まる案内なので、もう一度押させる理由が無い
        skipBeacon: true,
        // 色は必ずトークン経由。16進を直に書くと10テーマのどれとも合わない
        arrowColor: "var(--overlay-bg)",
        backgroundColor: "var(--overlay-bg)",
        overlayColor: "color-mix(in oklab, var(--scrim) 60%, transparent)",
        primaryColor: "var(--accent)",
        textColor: "var(--fg)",
        zIndex: 70,
      }}
      styles={{
        tooltip: { borderRadius: 14, padding: 14, fontSize: 12.5 },
        tooltipTitle: {
          fontSize: 13.5,
          fontWeight: 600,
          color: "var(--fg-strong)",
        },
        tooltipContent: { lineHeight: 1.7, color: "var(--fg-sub)" },
        buttonPrimary: {
          borderRadius: 8,
          fontSize: 12.5,
          fontWeight: 600,
          color: "var(--accent-fg)",
          padding: "9px 14px",
        },
        buttonBack: { fontSize: 12.5, color: "var(--fg-sub)" },
        buttonSkip: { fontSize: 12, color: "var(--fg-muted)" },
      }}
    />
  );
}
