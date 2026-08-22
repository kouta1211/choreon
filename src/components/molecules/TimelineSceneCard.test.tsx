import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import {
  cardHeight,
  TimelineSceneCard,
  TimelineSceneCluster,
} from "./TimelineSceneCard";
import { makeScene } from "@/test/factories";
import {
  maxCardHeight,
  TIMELINE_LAYOUT,
} from "@/features/music/lib/timelineLayout";

const PHONE = TIMELINE_LAYOUT.phone;

function renderCard(
  onSelect = vi.fn(),
  onMoveSeconds = vi.fn(),
  isSelected = false,
) {
  render(
    <TimelineSceneCard
      scene={makeScene({ id: "scene-1", name: "サビ", timeSeconds: 4 })}
      number={2}
      thumbnail={undefined}
      stageWidthUnits={12}
      stageHeightUnits={9}
      isSelected={isSelected}
      leftPx={130}
      onSelect={onSelect}
      onMoveSeconds={onMoveSeconds}
      pxPerSecond={26}
      layout={PHONE}
    />,
  );
  return { card: screen.getByRole("button", { name: "2. サビ" }), onSelect, onMoveSeconds };
}

/**
 * **押したまま待ってから**、動かして、離す。
 *
 * 待たずに引くと帯の方が動く（user の指示 2026-08-22:「コマの上を横へ
 * 引いたときは帯を動かす。コマの移動は別の手で」）。コマの帯は帯全体の
 * 大半を占めるので、コマの上から始めた操作を全部こちらが取ると、
 * 波形を引ける場所がほとんど残らない。
 */
function drag(card: HTMLElement, deltaX: number) {
  vi.useFakeTimers();
  fireEvent.pointerDown(card, { pointerId: 1, clientX: 100 });
  act(() => {
    vi.advanceTimersByTime(GRAB_HOLD_MS);
  });
  vi.useRealTimers();
  fireEvent.pointerMove(card, { pointerId: 1, clientX: 100 + deltaX });
  fireEvent.pointerUp(card, { pointerId: 1, clientX: 100 + deltaX });
}

/** 待たずに引く（帯を動かす操作） */
function dragWithoutHold(card: HTMLElement, deltaX: number) {
  fireEvent.pointerDown(card, { pointerId: 1, clientX: 100 });
  fireEvent.pointerMove(card, { pointerId: 1, clientX: 100 + deltaX });
  fireEvent.pointerUp(card, { pointerId: 1, clientX: 100 + deltaX });
}

/** コマを掴むまでの待ち時間。実装（TimelineSceneCard）と同じ値 */
const GRAB_HOLD_MS = 450;

describe("TimelineSceneCard", () => {
  it("軽く押しただけなら選ぶ", () => {
    const { card, onSelect, onMoveSeconds } = renderCard();
    fireEvent.pointerDown(card, { pointerId: 1, clientX: 100 });
    fireEvent.pointerUp(card, { pointerId: 1, clientX: 100 });

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onMoveSeconds).not.toHaveBeenCalled();
  });

  // 手がわずかに揺れただけで時刻が動いてはいけない
  it("数pxの揺れは選択として扱う", () => {
    const { card, onSelect, onMoveSeconds } = renderCard();
    drag(card, 2);

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onMoveSeconds).not.toHaveBeenCalled();
  });

  it("横へ引いた距離が秒に直る", () => {
    const { card, onMoveSeconds } = renderCard();
    drag(card, 52);

    // 26px/秒 なので 52px は 2秒
    expect(onMoveSeconds).toHaveBeenCalledWith(2);
  });

  it("左へ引けば負の秒数になる", () => {
    const { card, onMoveSeconds } = renderCard();
    drag(card, -26);

    expect(onMoveSeconds).toHaveBeenCalledWith(-1);
  });

  // どのシーンを動かしたのか分からないまま時刻だけ変わるのを避ける
  it("選ばれていないコマを引いたら、まず選ぶ", () => {
    const { card, onSelect } = renderCard(vi.fn(), vi.fn(), false);
    drag(card, 40);

    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("既に選ばれていれば選び直さない", () => {
    const { card, onSelect } = renderCard(vi.fn(), vi.fn(), true);
    drag(card, 40);

    expect(onSelect).not.toHaveBeenCalled();
  });

  // 離した位置までを勘定に入れる(最後のpointermoveで切り捨てない)
  it("最後に動かした位置ではなく、離した位置で決まる", () => {
    const { card, onMoveSeconds } = renderCard();
    vi.useFakeTimers();
    fireEvent.pointerDown(card, { pointerId: 1, clientX: 100 });
    act(() => {
      vi.advanceTimersByTime(GRAB_HOLD_MS);
    });
    vi.useRealTimers();
    fireEvent.pointerMove(card, { pointerId: 1, clientX: 110 });
    fireEvent.pointerUp(card, { pointerId: 1, clientX: 152 });

    expect(onMoveSeconds).toHaveBeenCalledWith(2);
  });

  it("途中で取り消されたら何も起こさない", () => {
    const { card, onSelect, onMoveSeconds } = renderCard();
    fireEvent.pointerDown(card, { pointerId: 1, clientX: 100 });
    fireEvent.pointerMove(card, { pointerId: 1, clientX: 160 });
    fireEvent.pointerCancel(card, { pointerId: 1 });

    expect(onSelect).not.toHaveBeenCalled();
    expect(onMoveSeconds).not.toHaveBeenCalled();
  });

  /**
   * **押した時点では帯へ渡す**（user の指示 2026-08-22）。
   * 以前はここで止めていたので、コマの上から始めた操作では波形を
   * 引けなかった。コマを掴むのは、押したまま待ったときだけ。
   */
  it("押した時点では、帯の操作を止めない", () => {
    const onBandPointerDown = vi.fn();
    render(
      <div onPointerDown={onBandPointerDown}>
        <TimelineSceneCard
          scene={makeScene({ id: "scene-9", name: "頭" })}
          number={1}
          thumbnail={undefined}
          stageWidthUnits={12}
          stageHeightUnits={9}
          isSelected={false}
          leftPx={30}
          onSelect={vi.fn()}
          onMoveSeconds={vi.fn()}
          pxPerSecond={26}
          layout={PHONE}
        />
      </div>,
    );

    fireEvent.pointerDown(screen.getByRole("button", { name: "1. 頭" }), {
      pointerId: 1,
      clientX: 30,
    });
    expect(onBandPointerDown).toHaveBeenCalledTimes(1);
  });
});

describe("cardHeight", () => {
  const cardLaneHeight = maxCardHeight(PHONE);

  it("ステージの縦横比に合わせる", () => {
    // 8:6 のステージなら仕様どおり 46×34 / 56×42
    expect(cardHeight(46, 8, 6, cardLaneHeight)).toBe(35);
    expect(cardHeight(56, 8, 6, cardLaneHeight)).toBe(42);
  });

  // PC はコマも幕も大きいので、同じ比でそのまま伸びる
  it("PCでは72×54 / 84×62になる", () => {
    const pc = TIMELINE_LAYOUT.desktop;
    expect(cardHeight(pc.cardWidth, 8, 6, maxCardHeight(pc))).toBe(54);
    expect(cardHeight(pc.selectedCardWidth, 8, 6, maxCardHeight(pc))).toBe(63);
  });

  it("縦長のステージでも幕からはみ出さない", () => {
    expect(cardHeight(46, 6, 12, cardLaneHeight)).toBe(cardLaneHeight);
  });

  it("横長すぎても潰れない", () => {
    expect(cardHeight(46, 40, 2, cardLaneHeight)).toBe(24);
  });
});

describe("TimelineSceneCluster", () => {
  it("何番から何番が重なっているかを読み上げる", () => {
    render(
      <TimelineSceneCluster
        numbers={[3, 4, 5, 6]}
        isSelected={false}
        leftPx={100}
        onZoom={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", {
        name: "シーン3〜6が重なっています。押すと広げて、1つずつ選びます",
      }),
    ).toBeInTheDocument();
  });
});

/**
 * コマの上から始めても、待たずに引けば**帯を動かす操作**。
 *
 * 実機の報告（2026-08-22）:「波形をドラッグして移動させられないときが
 * ある」。コマの帯は帯全体の大半を占めるので、コマの上から始めた操作を
 * 全部こちらが取ると、波形を引ける場所がほとんど残らなかった。
 */
describe("TimelineSceneCard（待たずに引いたとき）", () => {
  it("シーンの時刻は動かさない", () => {
    const { card, onMoveSeconds } = renderCard();

    dragWithoutHold(card, 60);

    expect(onMoveSeconds).not.toHaveBeenCalled();
  });

  /* 帯の側が自分でシークを始末する。ここで選ぶと、引いた拍子に
     関係ないシーンが選ばれる */
  it("選びもしない（引く操作なので）", () => {
    const { card, onSelect } = renderCard();

    dragWithoutHold(card, 60);

    expect(onSelect).not.toHaveBeenCalled();
  });

  it("待ってから引けば、今までどおり時刻が動く", () => {
    const { card, onMoveSeconds } = renderCard();

    drag(card, 52);

    expect(onMoveSeconds).toHaveBeenCalledWith(2);
  });
});
