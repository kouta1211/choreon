"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import type { EventData } from "react-joyride";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import {
  hasSeenTutorial,
  markTutorialSeen,
} from "@/features/tutorial/lib/tutorialPreference";
import { tourSteps } from "@/features/tutorial/lib/tourSteps";
import { useT } from "@/features/i18n/LocaleProvider";

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
 * ■ 案内は、いま目の前にあるものを言う
 * **どの作品でもカウントで組む**ようになった（2026-08-26）ので、曲の
 * 有無で言い分ける必要は無い。文の中身は `tourSteps.ts` が持つ。
 *
 * ■ いつでも飛ばせる
 * 使い方が分かっている人に読ませない。飛ばしても「見た」として扱い、
 * 二度と自動では出さない(もう一度見る道は表示メニューに置く)。
 */
export function EditorTour() {
  const t = useT();
  // 言語と物差しが変わったら作り直す。案内の中身は辞書が持つ
  const steps = useMemo(() => tourSteps(t), [t]);
  // 初回だけ自動で出す。読み込み直後は指す先がまだ描かれていないので、
  // 少し待ってから始める
  const [isAutoStarted, setAutoStarted] = useState(false);
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  const tourRequestedAt = useUIStore((state) => state.tourRequestedAt);

  useEffect(() => {
    // ゲストで始めるときに選んでいれば、それに従う。選んでいない
    // (ログイン済みの経路)なら、いままでどおり初回だけ自動で出す。
    // 購読せず getState で1回だけ読むのは、この判断がマウント時に
    // 一度決まればよく、途中で変わっても始め直す意味が無いため
    const intent = useUIStore.getState().guestTourIntent;
    if (intent === "skip") return;
    if (intent !== "show" && hasSeenTutorial()) return;

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
      steps={steps}
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
        textColor: "var(--text)",
        zIndex: 70,
      }}
      styles={{
        tooltip: {
          borderRadius: 14,
          padding: 14,
          fontSize: 12.5,
          /**
           * 後ろが透けないようにする。
           *
           * 地の色(--overlay-bg)は84%で、他の板はぼかしで沈めているが、
           * **ここではぼかしが使えない** — 親の .react-joyride__floater が
           * drop-shadow を持っており、filter を持つ祖先があると
           * backdrop-filter の対象が背後のページから外れる(指定しても
           * 何も起きない)。透かすのをやめ、地の色の上に板の色を重ねて
           * 不透明にする。色はトークンのままなので10テーマに追従する。
           */
          backgroundColor: "var(--bg)",
          backgroundImage:
            "linear-gradient(var(--overlay-bg), var(--overlay-bg))",
        },
        tooltipTitle: {
          fontSize: 13.5,
          fontWeight: 600,
          color: "var(--text-strong)",
        },
        tooltipContent: { lineHeight: 1.7, color: "var(--text-sub)" },
        buttonPrimary: {
          borderRadius: 8,
          fontSize: 12.5,
          fontWeight: 600,
          color: "var(--accent-fg)",
          padding: "9px 14px",
        },
        buttonBack: { fontSize: 12.5, color: "var(--text-sub)" },
        buttonSkip: { fontSize: 12, color: "var(--text-muted)" },
      }}
    />
  );
}
