import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ShareSheet } from "./ShareSheet";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import * as projectsApi from "@/features/project/api/projects";
import * as sharedTrackApi from "@/features/music/api/sharedTrack";
import * as musicStorage from "@/features/music/lib/musicStorage";
import { MAX_SHARED_TRACK_BYTES } from "@/features/music/lib/sharedTrack";
import { makeDancer, makeProject } from "@/test/factories";
import type { Project } from "@/features/project/types";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({}),
}));

/**
 * 共有のオン/オフのスイッチは外した(2026-08-17)。
 *
 * 「共有」を開いた人は配りたくて開いているので、そこからもう一度
 * スイッチを入れさせるのは押す前から答えの分かっている問いだった。
 *
 * **ここは実装側(私)がログイン後の画面を実機で触れない場所**なので、
 * 「開いた時点で共有が始まる」「やめられる」「鍵が無ければ勝手に
 * 始めない」をテストで押さえておく。取り違えると、開いただけで作品が
 * 配れる状態になる — 静かに間違えてよい場所ではない。
 *
 * ■ ストアがプロップより優先される
 * ShareSheet は `state.project?.id === project.id` なら**ストアの値**を
 * 正とする(プロジェクト名と同じ考え方)。だからここでも、見たい状態は
 * **ストアに入れる**。プロップだけ変えても効かない。
 */
function open(project: Project) {
  // 保存が実際に走る条件(ゲストでない・自動保存が入っている)にしておく
  useProjectStore.setState({ isGuest: false, project });
  return render(<ShareSheet project={project} isOpen onClose={() => {}} />);
}

afterEach(() => {
  vi.restoreAllMocks();
  useUIStore.setState({ confirm: null });
});

const SHARED = makeProject({ isShared: true, shareToken: "tok-123" });
const NOT_SHARED = makeProject({ isShared: false, shareToken: "tok-123" });
const NO_KEY = makeProject({ isShared: false, shareToken: null });

describe("ShareSheet", () => {
  it("オン/オフのスイッチは出さない", () => {
    open(SHARED);

    expect(
      screen.queryByRole("switch", {
        name: /リンクを知っている人が見られる/,
      }),
    ).not.toBeInTheDocument();
  });

  it("共有中なら、開いた時点でリンクが出ている", () => {
    open(SHARED);

    expect(screen.getByText(/自分にフォーカスしたフォーメーション/)).toBeInTheDocument();
    expect(screen.getByText(/tok-123/)).toBeInTheDocument();
  });

  /**
   * ここが要点。**開いた時点で共有が始まる。**
   * 配りたくて開いているので、もう一度オンにさせない。
   */
  it("まだ共有していない作品は、開いた時点で共有を始める", async () => {
    const spy = vi
      .spyOn(projectsApi, "updateProjectSharing")
      .mockResolvedValue(undefined);

    open(NOT_SHARED);

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith(expect.anything(), "project-1", true);
    });
    expect(useProjectStore.getState().project?.isShared).toBe(true);
  });

  /**
   * 出せるリンクが無いのに「共有中」になると、読めない状態になる。
   * 鍵はスキーマが古いと入っていない。
   */
  it("共有用の鍵が無ければ、勝手に共有を始めない", async () => {
    const spy = vi.spyOn(projectsApi, "updateProjectSharing");

    open(NO_KEY);

    expect(screen.getByText(/まだ共有用の鍵がありません/)).toBeInTheDocument();
    await waitFor(() => {
      expect(spy).not.toHaveBeenCalled();
    });
    expect(useProjectStore.getState().project?.isShared).toBe(false);
  });

  it("閉じている間は、何も始めない", async () => {
    const spy = vi.spyOn(projectsApi, "updateProjectSharing");
    useProjectStore.setState({ isGuest: false, project: NOT_SHARED });

    render(
      <ShareSheet project={NOT_SHARED} isOpen={false} onClose={() => {}} />,
    );

    await waitFor(() => {
      expect(spy).not.toHaveBeenCalled();
    });
    expect(useProjectStore.getState().project?.isShared).toBe(false);
  });

  /* 共有をやめるボタンは無くした（2026-08-20 の user の判断:
     「共有をやめることはない」）。**鍵は残っているので、必要になったら
     戻せる** — 画面から入口を消しただけで、状態そのものは残してある */
  it("「共有をやめる」は出さない", () => {
    open(SHARED);

    expect(screen.queryByText(/共有をやめる/)).toBeNull();
  });

  /* 作り直しは【リンクのすぐ隣】。離れた所に置くと、どのリンクを
     作り直すのか結び付かない（実機の要望 2026-08-20） */
  it("リンクの隣に、コピーと作り直しが並ぶ", () => {
    open(SHARED);

    expect(screen.getByLabelText("リンクをコピー")).toBeInTheDocument();
    expect(screen.getByLabelText("リンクを作り直す")).toBeInTheDocument();
  });

  /* 一人ひとりに配るリンクは消した。**開いた先でダンサーを選べる**ので、
     リンクを人数ぶん作り分ける必要が無い（2026-08-20） */
  it("一人ひとりに配るリンクは出さない", () => {
    useProjectStore.setState({
      dancers: { "dancer-1": makeDancer({ name: "あいり" }) },
    });
    open(SHARED);

    expect(screen.queryByText(/一人ひとり/)).toBeNull();
    expect(screen.queryByText("あいり")).toBeNull();
  });

});

/**
 * **配る側にも、曲が付いていかないことを言う**（user の報告 2026-09-25
 * 「共有をしたのですが、曲が聞こえません」）。
 *
 * この板の説明には前から「一行書いておかないと『壊れている』と
 * 受け取られる」と書いてあったが、**その一行は画面に無かった**。
 * 説明に書いた約束は、画面に出して初めて守ったことになる。
 */
describe("ShareSheet（曲は付いていかない）", () => {
  it("曲を入れた作品なら、届かないことを書く", () => {
    open(makeProject({ isShared: true, shareToken: "tok-123", musicTitle: "song.mp3" }));

    expect(screen.getByText(/曲は相手に届きません/)).toBeInTheDocument();
    expect(screen.getByText(/クリック を入れておくと/)).toBeInTheDocument();
  });

  /* クリックが入っていれば拍は鳴る。入れろと促すのは嘘になる */
  it("クリックが入っているなら、拍が鳴ると書く", () => {
    open(
      makeProject({
        isShared: true,
        shareToken: "tok-123",
        musicTitle: "song.mp3",
        isMetronomeEnabled: true,
      }),
    );

    expect(screen.getByText(/クリックは入っているので/)).toBeInTheDocument();
  });

  /* 曲を使っていない作品には、読む意味が無い */
  it("曲を入れていない作品には、何も書かない", () => {
    open(SHARED);

    expect(screen.queryByText(/曲は相手に届きません/)).toBeNull();
  });
});

/**
 * **曲も一緒に配る**（2026-09-25）。
 *
 * 音源は端末の IndexedDB にしか無いので、**共有のときだけ**サーバーへ置く。
 * ここで縛るのは「押せるかどうか」と、**消すときの順番**。
 * 順番を取り違えても画面は普通に動いて見えるが、消し損ねたときに
 * 前の曲が鳴り続ける。
 */
describe("ShareSheet（曲も一緒に配る）", () => {
  const WITH_MUSIC = makeProject({
    isShared: true,
    shareToken: "tok-123",
    musicTitle: "song.mp3",
  });

  /** この端末に、その大きさの音源があることにする */
  function deviceHas(bytes: number) {
    vi.spyOn(musicStorage, "loadTrack").mockResolvedValue({
      file: new File(["x"], "song.mp3", { type: "audio/mpeg" }),
      fileName: "song.mp3",
    });
    // File の size は読み取り専用なので、大きさだけ差し替える
    vi.spyOn(File.prototype, "size", "get").mockReturnValue(bytes);
  }

  it("端末に音源があれば、配るスイッチが出る", async () => {
    deviceHas(8_000_000);
    open(WITH_MUSIC);

    expect(
      await screen.findByRole("switch", { name: /曲も一緒に配る/ }),
    ).toBeInTheDocument();
  });

  it("どれだけ上がるかを添える", async () => {
    deviceHas(8_200_000);
    open(WITH_MUSIC);

    expect(await screen.findByText(/7\.8MB を上げます/)).toBeInTheDocument();
  });

  /* 上限を超えたら、押せる的そのものを出さない */
  it("大きすぎる曲は、理由を出してスイッチを出さない", async () => {
    deviceHas(MAX_SHARED_TRACK_BYTES + 1);
    open(WITH_MUSIC);

    expect(await screen.findByText(/20MB を超える曲は配れません/)).toBeInTheDocument();
    expect(screen.queryByRole("switch", { name: /曲も一緒に配る/ })).toBeNull();
  });

  /* 別の端末で入れた曲。上げる実体が手元に無い */
  it("この端末に音源が無ければ、そう言う", async () => {
    vi.spyOn(musicStorage, "loadTrack").mockResolvedValue(null);
    open(WITH_MUSIC);

    expect(
      await screen.findByText(/この端末に音源がありません/),
    ).toBeInTheDocument();
  });

  it("押すと、上げてから道を覚える", async () => {
    deviceHas(8_000_000);
    const upload = vi
      .spyOn(sharedTrackApi, "uploadSharedTrack")
      .mockResolvedValue("p1/abc.mp3");
    const setPath = vi
      .spyOn(projectsApi, "updateMusicPath")
      .mockResolvedValue(undefined);
    open(WITH_MUSIC);

    fireEvent.click(await screen.findByRole("switch", { name: /曲も一緒に配る/ }));

    await waitFor(() => expect(upload).toHaveBeenCalled());
    await waitFor(() =>
      expect(setPath).toHaveBeenCalledWith(expect.anything(), "project-1", "p1/abc.mp3"),
    );
  });

  /**
   * **ここが要。** やめるときは【先に列を null にしてから】実体を消す。
   *
   * 判定（`is_shared_music_object`）は列と道を突き合わせているので、
   * 列さえ変われば消し損ねても届かない。逆順だと、消せなかったときに
   * 前の曲が鳴り続ける — しかも作った人は自分の端末で聞いているので
   * 気づけない。
   */
  it("やめるときは、実体より先に道を消す", async () => {
    deviceHas(8_000_000);
    const order: string[] = [];
    vi.spyOn(projectsApi, "updateMusicPath").mockImplementation(async () => {
      order.push("列");
    });
    vi.spyOn(sharedTrackApi, "removeSharedTrack").mockImplementation(async () => {
      order.push("実体");
    });
    open({ ...WITH_MUSIC, musicPath: "p1/abc.mp3" });

    fireEvent.click(await screen.findByRole("switch", { name: /曲も一緒に配る/ }));

    await waitFor(() => expect(order).toEqual(["列", "実体"]));
  });
});
