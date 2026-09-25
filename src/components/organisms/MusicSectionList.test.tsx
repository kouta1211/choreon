import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MusicSectionList } from "./MusicSectionList";
import { LocaleProvider } from "@/features/i18n/LocaleProvider";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { makeProject, makeScene } from "@/test/factories";

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));

/**
 * **叩いて測るのは、その行の区間だけ。**
 *
 * `tapTempo` は「時刻の列 → 速さ」、`TapTempoButton` は「叩いた →
 * 呼び出し側へ渡す」までしか守っていない。**どの区間へ渡すか**は
 * ここでしか縛れない（.claude/rules/testing.md「純粋関数のテストは、
 * そこへ何を渡すかを守っていない」）。
 *
 * 取り違えても画面は普通に動いて見える — 直したつもりの曲とは別の曲の
 * 速さが変わるので、音を聴くまで気づけない。
 */
const TWO_SECTIONS = [
  { fromBeat: 0, atSeconds: 0, secondsPerBeat: 0.5 },
  { fromBeat: 16, atSeconds: 12, secondsPerBeat: 0.5 },
];

/** 時計を止める。進める時点はこちらで決める（motion も now() を呼ぶ） */
function useFakeClock() {
  const clock = { now: 1000 };
  vi.spyOn(performance, "now").mockImplementation(() => clock.now);
  return clock;
}

function open(placements = TWO_SECTIONS) {
  useProjectStore.setState({
    isGuest: true,
    project: makeProject({ musicPlacements: placements }),
    scenes: [
      makeScene({ positionBeats: 0 }),
      makeScene({ id: "s2", positionBeats: 32 }),
    ],
  });
  useUIStore.setState({ selectedSceneId: "scene-1" });
  render(
    <LocaleProvider locale="ja">
      <MusicSectionList />
    </LocaleProvider>,
  );
}

const placements = () =>
  useProjectStore.getState().project?.musicPlacements ?? [];

const tapButtons = () =>
  screen.queryAllByRole("button", { name: /を叩いて測る/ });

afterEach(() => {
  vi.restoreAllMocks();
});

describe("MusicSectionList", () => {
  it("区切りごとに「叩いて測る」が1つずつ出る", () => {
    open();

    expect(tapButtons()).toHaveLength(2);
  });

  /** 読み上げで見分けが付くように、区間の名前が名前に入っている */
  it("どの区間のものか、読み上げの名前で分かる", () => {
    open();

    expect(
      screen.getByRole("button", { name: "「2曲目」を叩いて測る" }),
    ).toBeInTheDocument();
  });

  /* **ここが要。** 2つ目を叩いたのに1つ目が変われば、
     直したつもりの曲とは別の曲の速さが動く */
  it("2つ目を叩くと、2つ目の区間の速さだけが変わる", () => {
    const clock = useFakeClock();
    open();

    const second = screen.getByRole("button", {
      name: "「2曲目」を叩いて測る",
    });
    // 0.4秒あけて2回 = BPM 150 = 1拍 0.4秒
    fireEvent.click(second);
    clock.now += 400;
    fireEvent.click(second);

    const after = placements();
    expect(after[1].secondsPerBeat).toBeCloseTo(0.4, 6);
    // 1つ目は動かない（元の 0.5 のまま）
    expect(after[0].secondsPerBeat).toBeCloseTo(0.5, 6);
  });

  it("1つ目を叩くと、1つ目の区間の速さだけが変わる", () => {
    const clock = useFakeClock();
    open();

    const first = screen.getByRole("button", {
      name: "「1曲目」を叩いて測る",
    });
    fireEvent.click(first);
    clock.now += 400;
    fireEvent.click(first);

    const after = placements();
    expect(after[0].secondsPerBeat).toBeCloseTo(0.4, 6);
    expect(after[1].secondsPerBeat).toBeCloseTo(0.5, 6);
  });

  /* 区切りが1つのときは一覧そのものを出さない（速さの口は
     シート側のスライダー／欄が持つ） */
  it("区切りが1つなら、一覧も叩くボタンも出さない", () => {
    open([{ fromBeat: 0, atSeconds: 0, secondsPerBeat: 0.5 }]);

    expect(tapButtons()).toHaveLength(0);
  });
});
