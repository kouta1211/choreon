import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MusicSectionList } from "./MusicSectionList";
import { LocaleProvider } from "@/features/i18n/LocaleProvider";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useMusicStore } from "@/features/music/store/useMusicStore";
import { makeProject, makeScene } from "@/test/factories";

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));

/**
 * **クリックして測るのは、その行の区間だけ。**
 *
 * `tapTempo` は「時刻の列 → 速さ」、`TapTempoButton` は「押された →
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
  screen.queryAllByRole("button", { name: /をクリックして測る/ });

afterEach(() => {
  vi.restoreAllMocks();
});

describe("MusicSectionList", () => {
  it("区切りごとに「クリックして測る」が1つずつ出る", () => {
    open();

    expect(tapButtons()).toHaveLength(2);
  });

  /** 読み上げで見分けが付くように、区間の名前が名前に入っている */
  it("どの区間のものか、読み上げの名前で分かる", () => {
    open();

    expect(
      screen.getByRole("button", { name: "「2曲目」をクリックして測る" }),
    ).toBeInTheDocument();
  });

  /* **ここが要。** 2つ目を押したのに1つ目が変われば、
     直したつもりの曲とは別の曲の速さが動く */
  it("2つ目を押すと、2つ目の区間の速さだけが変わる", () => {
    const clock = useFakeClock();
    open();

    const second = screen.getByRole("button", {
      name: "「2曲目」をクリックして測る",
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

  it("1つ目を押すと、1つ目の区間の速さだけが変わる", () => {
    const clock = useFakeClock();
    open();

    const first = screen.getByRole("button", {
      name: "「1曲目」をクリックして測る",
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
  it("区切りが1つなら、一覧も測るボタンも出さない", () => {
    open([{ fromBeat: 0, atSeconds: 0, secondsPerBeat: 0.5 }]);

    expect(tapButtons()).toHaveLength(0);
  });
});

/** ▶ は曲があるときだけ出る。鳴らす相手を先に入れておく */
function withMusic({
  isPlaying,
  currentTime = 0,
}: {
  isPlaying: boolean;
  currentTime?: number;
}) {
  useMusicStore.setState({ objectUrl: "blob:song", currentTime });
  useUIStore.setState({ seekRequest: null, isPlaying });
}

/**
 * **▶ は、その行の区間の頭から鳴らす。**
 *
 * ただ再生するだけだと縦線の居る所から鳴るので、2曲目の行を押したのに
 * 1曲目が鳴る。測りたいのはその行の曲なので、先に頭へ送る。
 * 送る先（`<audio>`）を持っているのは SceneDock なので、ここでは
 * **頼みがストアへ正しく置かれたか**までを縛る。
 */
describe("MusicSectionList（その区間を流す）", () => {
  it("2つ目の ▶ は、2つ目の区間の頭へ送るよう頼む", () => {
    withMusic({ isPlaying: false });
    open();

    fireEvent.click(
      screen.getAllByRole("button", { name: "この区間を流す" })[1],
    );

    // 2つ目の頭は 12秒（atSeconds）。1つ目の 0秒 ではない
    expect(useUIStore.getState().seekRequest?.seconds).toBe(12);
  });

  it("1つ目の ▶ は、曲の頭（0秒）へ送るよう頼む", () => {
    withMusic({ isPlaying: false });
    open();

    fireEvent.click(
      screen.getAllByRole("button", { name: "この区間を流す" })[0],
    );

    expect(useUIStore.getState().seekRequest?.seconds).toBe(0);
  });

  /* 止めるときは送らない。押した所で止まるのが再生の約束
     （user の指示 2026-08-22）で、そこを崩さない */
  it("その行が鳴っている間に押したときは、送らずに止めるだけ", () => {
    // 2つ目の区間（12秒〜）を鳴らしている
    withMusic({ isPlaying: true, currentTime: 20 });
    open();

    fireEvent.click(screen.getByRole("button", { name: "止める" }));

    expect(useUIStore.getState().seekRequest).toBeNull();
  });

  /* **ここが user の報告そのもの。** 全体の isPlaying を配っていたので、
     どの行のボタンも一斉に「止める」へ変わっていた */
  it("鳴っているのは1行だけ。他の行は「流す」のまま", () => {
    withMusic({ isPlaying: true, currentTime: 20 });
    open();

    expect(screen.getAllByRole("button", { name: "止める" })).toHaveLength(1);
    expect(
      screen.getAllByRole("button", { name: "この区間を流す" }),
    ).toHaveLength(1);
  });

  it("鳴っていない行を押したら、鳴ったままその区間の頭へ送る", () => {
    // 2つ目を鳴らしている状態で、1つ目を押す
    withMusic({ isPlaying: true, currentTime: 20 });
    open();

    fireEvent.click(screen.getByRole("button", { name: "この区間を流す" }));

    expect(useUIStore.getState().seekRequest?.seconds).toBe(0);
  });

  it("止まっているときは、どの行も「流す」", () => {
    withMusic({ isPlaying: false, currentTime: 20 });
    open();

    expect(
      screen.getAllByRole("button", { name: "この区間を流す" }),
    ).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "止める" })).toBeNull();
  });
});
