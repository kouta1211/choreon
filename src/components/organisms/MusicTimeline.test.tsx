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

/**
 * **区間バーを押したときに、どの秒へ飛ぶか。**
 *
 * `TimelineSpanLayer` の側には「押したら `onJumpToHead` を呼ぶ」までしか
 * 書いていない。**何秒を渡すかは呼び出し側の仕事**で、`toSeconds` を
 * 渡しても型は通り、あちらのテストも緑のまま（.claude/rules/testing.md
 * の「純粋関数のテストは、そこへ何を渡すかを守っていない」）。
 *
 * だから**頭と終わりで答えが分かれる**作品で縛る。2曲目は
 * 12秒から始まり 20秒で終わるので、取り違えたらこの数で落ちる。
 */
const TWO_SONGS = makeProject({
  musicPlacements: [
    { fromBeat: 0, atSeconds: 0, secondsPerBeat: 0.5 },
    { fromBeat: 16, atSeconds: 12, secondsPerBeat: 0.5 },
  ],
});

function setUpTwoSongs() {
  useProjectStore.setState({
    project: TWO_SONGS,
    scenes: [
      makeScene({ positionBeats: 0 }),
      makeScene({ id: "scene-2", name: "シーン2", orderIndex: 1, positionBeats: 32 }),
    ],
  });
  useUIStore.setState({ selectedSceneId: "scene-1", isPlaying: false });
  // 曲が入っていないと区間バーは出ない（載せる相手が無い）
  useMusicStore.setState({ currentTime: 0, objectUrl: "blob:song" });
  render(<MusicTimeline project={TWO_SONGS} audioRef={createRef()} />);
}

/** 区間バーの本体。曲ごとに1つ出るので、並びで引く */
function spanBodies(): HTMLElement[] {
  return screen.getAllByRole("button", {
    name: "押すとこの曲の頭へ、引くと振付ぜんぶを前後へ動かす",
  });
}

describe("MusicTimeline の、区間バーを押したとき", () => {
  beforeEach(() => {
    useMusicStore.setState({ currentTime: 0, objectUrl: null });
  });

  it("2曲目のバーを押すと、縦線が2曲目の頭（12秒）へ行く", () => {
    setUpTwoSongs();
    const second = spanBodies()[1];
    second.setPointerCapture = () => {};

    tap(second, 0);

    // 終わり（20秒）ではない。取り違えたらここで落ちる
    expect(useMusicStore.getState().currentTime).toBe(12);
  });

  it("1曲目のバーを押すと、曲の頭（0秒）へ戻る", () => {
    setUpTwoSongs();
    useMusicStore.setState({ currentTime: 15 });
    const first = spanBodies()[0];
    first.setPointerCapture = () => {};

    tap(first, 0);

    expect(useMusicStore.getState().currentTime).toBe(0);
  });

  /** 押しただけでは載せ方を書き換えない（保存が飛ばない） */
  it("押しただけでは、載せ方は変わらない", () => {
    setUpTwoSongs();
    const second = spanBodies()[1];
    second.setPointerCapture = () => {};

    tap(second, 0);

    expect(useProjectStore.getState().project?.musicPlacements).toEqual(
      TWO_SONGS.musicPlacements,
    );
  });
});
