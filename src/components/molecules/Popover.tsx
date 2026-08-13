"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from "react";
import { TAP_PATTERN, vibrate } from "@/lib/haptics";
import { PressableButton } from "@/components/atoms/PressableButton";

/** 長押しと見なすまでの時間。触覚を返して「出るよ」と知らせる */
const HOLD_MS = 450;
/** PC のホバーで出すまで。すぐ出すと、通りすがりに開いて鬱陶しい */
const HOVER_MS = 400;
/** ホバーが外れてから閉じるまで。板の上へマウスを移す間を残す */
const HOVER_CLOSE_MS = 150;
/** 自動で出したものが消えるまで */
const AUTO_CLOSE_MS = 6000;
/** 画面の縁に残す余白 */
const EDGE_MARGIN_PX = 14;
const PANEL_MAX_WIDTH = 300;

type Placement = {
  left: number;
  top: number;
  /** 対象の中心。三角だけがこれを追う */
  arrowLeft: number;
  isAbove: boolean;
};

/**
 * 説明のポップオーバー。`title` 属性を置き換える。
 *
 * ■ なぜ `title` をやめるのか
 * 出るまでに1秒以上かかり、テーマの色が当たらず、そして
 * 【タッチでは出ない】。主対象がスマートフォンなので、touch で
 * 到達できない説明は、無いのと同じ。
 *
 * ■ 出し方は3つだけ
 * 長押し / 行の右端の `?` / その機能を初めて ON にしたときの1回。
 * ホバーは PC で【足す】条件であって、それだけで到達できる機能は作らない。
 *
 * ■ 手で出したものは自動で消さない
 * 読み終わる前に消えると、もう一度同じ操作をすることになる。
 * 自動で出したものだけ6秒で引っ込める。
 *
 * ■ 三角だけが対象を追う
 * 板は画面の中に収まるようにクランプするので、対象の真下に置けない
 * ことがある。板ごと動かすと縁で切れるため、板は収めて三角だけを
 * 対象の中心に合わせる。
 */
export function usePopover({
  heading,
  body,
  action,
}: {
  heading: string;
  body: string;
  /** 下に出す主ボタン。押すと閉じる */
  action?: { label: string; note?: string };
}) {
  const [placement, setPlacement] = useState<Placement | null>(null);
  const [isAuto, setIsAuto] = useState(false);
  const anchorRef = useRef<HTMLElement | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const movedRef = useRef(false);

  const clearTimers = () => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    holdTimerRef.current = null;
    closeTimerRef.current = null;
  };

  const close = useCallback(() => {
    clearTimers();
    setPlacement(null);
    setIsAuto(false);
  }, []);

  const openAt = useCallback((element: HTMLElement, auto = false) => {
    const rect = element.getBoundingClientRect();
    // 下が既定。上に出すと指で隠れる
    const spaceBelow = window.innerHeight - rect.bottom;
    const isAbove = spaceBelow < 160;

    const width = Math.min(PANEL_MAX_WIDTH, window.innerWidth - EDGE_MARGIN_PX * 2);
    const centre = rect.left + rect.width / 2;
    const left = Math.min(
      window.innerWidth - EDGE_MARGIN_PX - width,
      Math.max(EDGE_MARGIN_PX, centre - width / 2),
    );

    setPlacement({
      left,
      top: isAbove ? rect.top - 10 : rect.bottom + 10,
      arrowLeft: Math.min(
        left + width - 18,
        Math.max(left + 12, centre) ,
      ),
      isAbove,
    });
    setIsAuto(auto);
  }, []);

  /** その機能を初めて ON にしたときの1回。呼び出し側が条件を持つ */
  const openAutomatically = useCallback(() => {
    const element = anchorRef.current;
    if (!element) return;
    openAt(element, true);
  }, [openAt]);

  // 開いている間は、どこを触っても閉じる。スクロールでも閉じる
  // (追従させると、指を離した先で板が動いて読めない)
  useEffect(() => {
    if (!placement) return;

    const onDown = () => close();
    const onScroll = () => close();
    window.addEventListener("pointerdown", onDown, { capture: true });
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);

    const auto = isAuto
      ? setTimeout(() => close(), AUTO_CLOSE_MS)
      : undefined;

    return () => {
      window.removeEventListener("pointerdown", onDown, { capture: true });
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
      if (auto) clearTimeout(auto);
    };
  }, [placement, isAuto, close]);

  useEffect(() => clearTimers, []);

  const triggerProps = {
    ref: (element: HTMLElement | null) => {
      anchorRef.current = element;
    },
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      const element = event.currentTarget;
      movedRef.current = false;
      clearTimers();
      holdTimerRef.current = setTimeout(() => {
        if (movedRef.current) return;
        vibrate(TAP_PATTERN);
        openAt(element);
      }, HOLD_MS);
    },
    onPointerMove: () => {
      movedRef.current = true;
    },
    onPointerUp: () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    },
    onPointerCancel: () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    },
    // PC で【足す】条件。これが無くても長押しで到達できる
    onPointerEnter: (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType !== "mouse") return;
      const element = event.currentTarget;
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      holdTimerRef.current = setTimeout(() => openAt(element), HOVER_MS);
    },
    onPointerLeave: (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType !== "mouse") return;
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      closeTimerRef.current = setTimeout(() => close(), HOVER_CLOSE_MS);
    },
  };

  const popover = placement ? (
    <PopoverPanel
      placement={placement}
      heading={heading}
      body={body}
      action={action}
      onClose={close}
    />
  ) : null;

  return { triggerProps, popover, openAutomatically, close, isOpen: !!placement };
}

function PopoverPanel({
  placement,
  heading,
  body,
  action,
  onClose,
}: {
  placement: Placement;
  heading: string;
  body: string;
  action?: { label: string; note?: string };
  onClose: () => void;
}): ReactNode {
  return (
    <div
      role="tooltip"
      style={{
        left: placement.left,
        top: placement.top,
        maxWidth: PANEL_MAX_WIDTH,
        transform: placement.isAbove ? "translateY(-100%)" : undefined,
      }}
      className="overlay-panel fixed z-[60] rounded-[calc(var(--radius)*1.1667)] px-[14px] py-[13px]"
      onPointerDown={(event) => event.stopPropagation()}
    >
      {/* 指し先の三角。12px の正方形を45°回して、外側の2辺だけに枠線 */}
      <span
        aria-hidden
        style={{
          left: placement.arrowLeft - placement.left - 6,
          [placement.isAbove ? "bottom" : "top"]: -7,
          background: "var(--overlay-bg)",
          borderTop: placement.isAbove ? "none" : "1px solid var(--overlay-line)",
          borderLeft: placement.isAbove
            ? "none"
            : "1px solid var(--overlay-line)",
          borderBottom: placement.isAbove
            ? "1px solid var(--overlay-line)"
            : "none",
          borderRight: placement.isAbove
            ? "1px solid var(--overlay-line)"
            : "none",
        }}
        className="absolute block h-3 w-3 rotate-45"
      />

      <p className="text-label leading-snug font-semibold text-fg-strong">
        {heading}
      </p>
      <p className="mt-1 text-caption leading-[1.65] text-fg-sub">{body}</p>

      {action && (
        <div className="mt-2.5">
          <PressableButton
            kind="primary"
            onClick={onClose}
            className="flex h-[30px] w-full items-center justify-center rounded-[calc(var(--radius)*0.6)] bg-accent text-label font-semibold text-accent-fg"
          >
            {action.label}
          </PressableButton>
          {action.note && (
            <p className="mt-1 text-caption text-fg-muted">{action.note}</p>
          )}
        </div>
      )}
    </div>
  );
}
