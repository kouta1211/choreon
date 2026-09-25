import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MusicSheet } from "./MusicSheet";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useMusicStore } from "@/features/music/store/useMusicStore";
import { makeProject } from "@/test/factories";
import type { Project } from "@/features/project/types";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({}),
}));

/**
 * 曲の板。ここで押さえるのは**何を出すか**の1点。
 *
 * 曲を選ぶ前は、頭出しの欄が押せても意味が無い(何秒目から鳴らすかを
 * 決める相手がいない)ので出さない。
 *
 * **ただし値が入っていれば、曲が無くても出す。** 頭出しは端末の好みでは
 * なく作品の一部で、クラウドに残る。別の端末で開くと音源だけが無い状態に
 * なるので、そこで欄ごと隠すと「なぜ途中から鳴るのか」を確かめる手段が
 * 消える。**入口を塞ぐ変更は、奥にある物を黙って殺す**(2026-08-20 の教訓)。
 */
function open(project: Project, music: { fileName: string | null }) {
  // ゲストなら persist が何もせずに返る(保存の成否ではなく、画面の
  // 振る舞いだけを見たいのでこちらにする)
  useProjectStore.setState({ isGuest: true, project });
  useMusicStore.setState({
    fileName: music.fileName,
    objectUrl: null,
    durationSeconds: null,
  });
  return render(<MusicSheet project={project} isOpen onClose={() => {}} />);
}

const offsetField = () => screen.queryByRole("spinbutton", { name: /開始位置/ });

afterEach(() => {
  useMusicStore.setState({ fileName: null, objectUrl: null });
});

describe("MusicSheet", () => {
  /* **頭出しの欄は消した**（2026-08-26・第4段）。
     「振付が曲の何秒目から始まるか」は、時間軸の上のバーが持つ。
     欄が戻ってくると、同じことを言う口が2つになる */
  it("頭出しの欄を出さない（時間軸のバーが持つ）", () => {
    open(makeProject(), { fileName: "song.mp3" });

    expect(offsetField()).not.toBeInTheDocument();
    expect(screen.queryByText(/曲の開始位置/)).not.toBeInTheDocument();
  });

  it("「ここから◯秒聴く」のボタンも出さない", () => {
    open(makeProject(), { fileName: "song.mp3" });

    expect(screen.queryByRole("button", { name: /秒聴く/ })).toBeNull();
  });

  it("曲があるときは、曲がないときの拍を出さない", () => {
    open(makeProject(), { fileName: "song.mp3" });

    expect(screen.queryByText("曲がないときの拍")).not.toBeInTheDocument();
  });

  it("同じ約束を2度言わない（曲の控えの説明は1行だけ）", () => {
    open(makeProject(), { fileName: "song.mp3" });

    expect(screen.getAllByText(/共有した相手には付いていきません/)).toHaveLength(
      1,
    );
    expect(screen.queryByText(/開き直しても入ったままです/)).toBeNull();
  });
});

/**
 * **音源はこの端末にしか無い**（`musicStorage.ts`・IndexedDB）。
 * 別のブラウザで開けば必ず消えるが、曲名は作品に残っている
 * （`projects.music_title`）。
 *
 * 純粋関数（`trackPresence`）は3つの状態を分けるところまでしか
 * 守っていない。**そこへ何を渡すか**と**返り値をどこへ出すか**は
 * ここで縛る（.claude/rules/testing.md「純粋関数のテストは、
 * そこへ何を渡すかを守っていない」）。
 */
describe("MusicSheet（音源がこの端末に無いとき）", () => {
  it("覚えている曲名を出す（曲なしと同じ顔にしない）", () => {
    open(makeProject({ musicTitle: "本番音源.mp3" }), { fileName: null });

    expect(screen.getByText("本番音源.mp3")).toBeInTheDocument();
  });

  it("鳴らせない理由を、その場で言う", () => {
    open(makeProject({ musicTitle: "本番音源.mp3" }), { fileName: null });

    expect(
      screen.getByText(/音源はこの端末にありません/),
    ).toBeInTheDocument();
  });

  /* **仮の物差しは残す。** 名前で出し分けると、鳴らせない端末で
     メトロノームまで消える（音が無いのに拍も取れなくなる） */
  it("鳴らせないときは、曲がないときの拍を出したままにする", () => {
    open(makeProject({ musicTitle: "本番音源.mp3" }), { fileName: null });

    expect(screen.getByText("曲がないときの拍")).toBeInTheDocument();
  });

  /* 答えが分かれる形で書く。ready と missing で出す物が違う */
  it("この端末に音源があるときは、その注意を出さない", () => {
    open(makeProject({ musicTitle: "本番音源.mp3" }), {
      fileName: "本番音源.mp3",
    });

    expect(screen.queryByText(/音源はこの端末にありません/)).toBeNull();
    // 鳴らせるときは仮の物差しを出さない（音が2つ重ならないように）
    expect(screen.queryByText("曲がないときの拍")).toBeNull();
  });

  it("端末と作品で名前が違うときは、いま鳴っている方を出す", () => {
    open(makeProject({ musicTitle: "古い名前.mp3" }), {
      fileName: "いま鳴っている.mp3",
    });

    expect(screen.getByText("いま鳴っている.mp3")).toBeInTheDocument();
    expect(screen.queryByText("古い名前.mp3")).toBeNull();
  });

  it("どちらも無ければ、曲の行そのものを出さない", () => {
    open(makeProject({ musicTitle: null }), { fileName: null });

    expect(screen.queryByText(/共有した相手には付いていきません/)).toBeNull();
    expect(screen.queryByText(/音源はこの端末にありません/)).toBeNull();
  });
});

/**
 * **速さを数字で決める口は、いつでもちょうど1つ。**
 *
 * 曲を入れるとメトロノームの束ごと閉じるので、以前は
 * 「曲あり・区切り1つ」のときだけ**どこにも無くなって**いた
 * （残るのは時間軸のバーの取っ手だけ）。
 * 逆に、区切りが2つ以上あるときに出すと、区間ごとの欄と
 * **同じ値を変える口が2つ**になる。
 */
/* **完全一致で引く。** 区切り一覧の「この区間の速さ(BPM)」も
   部分一致では当たってしまう（別の口なので混ぜない） */
const speedField = () =>
  screen.queryByRole("spinbutton", { name: "速さ(BPM)" });

describe("MusicSheet（速さの欄）", () => {
  it("曲があって区切りが1つなら、速さを数字で決められる", () => {
    open(makeProject({ bpm: 120 }), { fileName: "song.mp3" });

    expect(speedField()).toBeInTheDocument();
  });

  /* 曲が無いときは「曲がないときの拍」のスライダーが持つ。
     両方出すと口が2つになる */
  it("曲が無いときは出さない（スライダーの側が持つ）", () => {
    open(makeProject({ bpm: 120 }), { fileName: null });

    expect(speedField()).toBeNull();
    expect(screen.getByText("曲がないときの拍")).toBeInTheDocument();
  });

  /* 答えが分かれる値で書く。区切りが2つあるかどうかで出し分けが変わる */
  it("区切りが2つ以上あるときは出さない（区間ごとの欄が持つ）", () => {
    open(
      makeProject({
        bpm: 120,
        musicPlacements: [
          { fromBeat: 0, atSeconds: 0, secondsPerBeat: 0.5 },
          { fromBeat: 16, atSeconds: 12, secondsPerBeat: 0.5 },
        ],
      }),
      { fileName: "song.mp3" },
    );

    expect(speedField()).toBeNull();
  });

  /** バーの取っ手と同じ値だと分かるように、一言添える */
  it("バーの取っ手と同じ値であることを書いてある", () => {
    open(makeProject({ bpm: 120 }), { fileName: "song.mp3" });

    expect(screen.getByText(/取っ手を引いても、同じ速さ/)).toBeInTheDocument();
  });
});

/**
 * **叩いて測る**（2026-09-25）。書き込む先は欄・スライダーと同じなので、
 * 出し分けの決まりも同じ — 速さの口が1つのときだけ出す。
 */
const tapButton = () => screen.queryByRole("button", { name: "クリックして測る" });

const TWO_SECTIONS = [
  { fromBeat: 0, atSeconds: 0, secondsPerBeat: 0.5 },
  { fromBeat: 16, atSeconds: 12, secondsPerBeat: 0.5 },
];

describe("MusicSheet（叩いて測る）", () => {
  it("曲があるときに出る", () => {
    open(makeProject(), { fileName: "song.mp3" });

    expect(tapButton()).toBeInTheDocument();
  });

  /* 曲が無くても使える。スピーカーから流れている音でも測れるのが
     この手つきの利点で、そこを塞がない */
  it("曲が無くても出る（スピーカーの音でも測れる）", () => {
    open(makeProject(), { fileName: null });

    expect(tapButton()).toBeInTheDocument();
  });

  /* 答えが分かれる値で書く。区切りの数で出し分けが変わる */
  it("区切りが2つ以上あるときは出さない（どの区間か読めない）", () => {
    open(makeProject({ musicPlacements: TWO_SECTIONS }), {
      fileName: "song.mp3",
    });

    expect(tapButton()).toBeNull();
  });
});
