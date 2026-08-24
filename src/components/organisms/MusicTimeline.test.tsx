import { beforeEach, describe, expect, it } from "vitest";
import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MusicTimeline } from "./MusicTimeline";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useMusicStore } from "@/features/music/store/useMusicStore";
import { makeProject, makeScene } from "@/test/factories";

/**
 * **シーンを切り替えるのは、コマを触ったときだけ。**
 *
 * user の指示（2026-08-24）:「シーンのコマを触ったらそのシーンに
 * フォーカスがいくように。それ以外のところを触ってもシーンの
 * 切り替えはしない。波形をクリックしたら、縦線が変更するだけ」
 *
 * ここで縛るのは**帯の地を触ったとき**。以前はここで
 * `sceneIndexAtSeconds` を引いて選び直していて、コマは時刻の真上に
 * 中心があるぶん**左半分を押すと1つ前が選ばれる**という形で表に出た。
 */
const project = makeProject({ isMetronomeEnabled: true, bpm: 120 });

function setUp() {
  useProjectStore.setState({
    project,
    scenes: [
      makeScene({ timeSeconds: 0 }),
      makeScene({
        id: "scene-2",
        name: "シーン2",
        orderIndex: 1,
        timeSeconds: 4,
      }),
    ],
  });
  useUIStore.setState({ selectedSceneId: "scene-1", isPlaying: false });
  useMusicStore.setState({ currentTime: 0 });
  render(<MusicTimeline project={project} audioRef={createRef()} />);
}

/** 帯の地（波形が乗っている面）。案内の目印から引く */
function bandElement(): HTMLElement {
  const band = document.querySelector<HTMLElement>('[data-tour="timeline"]');
  if (!band) throw new Error("帯が見つからない");
  return band;
}

/** 動かさずに押して離す＝タップ */
function tap(element: HTMLElement, clientX: number) {
  fireEvent.pointerDown(element, { pointerId: 1, clientX });
  fireEvent.pointerUp(element, { pointerId: 1, clientX });
}

const selectedSceneId = () => useUIStore.getState().selectedSceneId;

describe("MusicTimeline の、帯を触ったとき", () => {
  beforeEach(() => {
    useMusicStore.setState({ currentTime: 0 });
  });

  it("帯の地を触っても、シーンは切り替わらない", () => {
    setUp();
    tap(bandElement(), 300);
    expect(selectedSceneId()).toBe("scene-1");
  });

  it("帯の地を触ったら、再生位置（縦線）は動く", () => {
    setUp();
    tap(bandElement(), 300);
    expect(useMusicStore.getState().currentTime).toBeGreaterThan(0);
  });

  it("コマを触ったら、そのシーンへ切り替わる", () => {
    setUp();
    tap(screen.getByRole("button", { name: "2. シーン2" }), 300);
    expect(selectedSceneId()).toBe("scene-2");
  });

  it("コマを触ったら、縦線はそのシーンの時刻ちょうどへ行く", () => {
    setUp();
    tap(screen.getByRole("button", { name: "2. シーン2" }), 300);
    expect(useMusicStore.getState().currentTime).toBe(4);
  });
});
