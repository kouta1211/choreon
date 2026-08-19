"use client";

import { useEffect } from "react";
import { ChevronDown, Pause, Play, Spline } from "lucide-react";
import { useViewerStore } from "@/features/viewer/store/useViewerStore";
import { saveLastViewed } from "@/features/viewer/lib/lastViewed";
import { ViewerEntry } from "@/components/organisms/ViewerEntry";
import { ViewerStage } from "@/components/organisms/ViewerStage";
import { ViewerSceneStrip } from "@/components/organisms/ViewerSceneStrip";
import { ViewerRoute } from "@/components/organisms/ViewerRoute";
import { PressableButton } from "@/components/atoms/PressableButton";
import { RotateToPortraitNotice } from "@/components/molecules/RotateToPortraitNotice";
import { ViewerSceneList } from "@/components/organisms/ViewerSceneList";
import { ViewerViewMenu } from "@/components/organisms/ViewerViewMenu";
import { themedDancerColor } from "@/features/dancer/lib/themedColor";
import type { Dancer } from "@/features/dancer/types";
import type { Project } from "@/features/project/types";
import type { Position, Scene } from "@/features/scene/types";
import { useT } from "@/features/i18n/LocaleProvider";
import { useMetronome } from "@/features/music/hooks/useMetronome";
import { DEFAULT_BPM } from "@/features/music/lib/metronomePreference";

type Props = {
  project: Project;
  dancers: Dancer[];
  scenes: Scene[];
  positions: Position[];
  /** ?p= で指定されたポジション。振付師が個別にリンクを配れる */
  requestedDancerId: string | null;
};

/**
 * 稽古場でダンサーが見る画面。編集の操作は一切出さない。
 *
 * ■ 出さないもの
 * ダンサーのドラッグ・回転ハンドル・シーンの追加/削除/並び替え・
 * テンプレート・インスペクター・履歴・シンメトリー・作品名の編集・保存。
 * 隠すのではなく【持っていない】 — ストアが編集のアクションを持たないので、
 * 支援技術から押せるボタンも、効くショートカットも存在しない。
 *
 * ■ 階層がエディタと逆
 * 主操作は再生ではなくスクラブ。知りたいのは特定の瞬間の立ち位置で、
 * それは指で止められる操作の方が速い。帯が画面幅いっぱいで、
 * 再生ボタンは36pxの枠線ボタンに格下げしてある。
 *
 * ■ 横持ちは2カラム
 * 稽古場では横に置いて見ることが多い。縦のままだとステージが潰れる。
 */
export function ViewerLayout({
  project,
  dancers,
  scenes,
  positions,
  requestedDancerId,
}: Props) {
  const t = useT();
  const hydrate = useViewerStore((state) => state.hydrate);
  const hasChosen = useViewerStore((state) => state.hasChosen);
  const focusedDancerId = useViewerStore((state) => state.focusedDancerId);
  const chooseAgain = useViewerStore((state) => state.chooseAgain);
  const isPathVisible = useViewerStore((state) => state.isPathVisible);
  const togglePath = useViewerStore((state) => state.togglePath);
  const currentSeconds = useViewerStore((state) => state.currentSeconds);
  const setCurrentSeconds = useViewerStore((state) => state.setCurrentSeconds);
  /* 再生中かはストアが持つ。帯やシーン一覧から飛ぶときに止める必要があり、
     ここに閉じ込めていると止められない（実機の要望 2026-08-19） */
  const isPlaying = useViewerStore((state) => state.isPlaying);
  const setIsPlaying = useViewerStore((state) => state.setIsPlaying);

  useEffect(() => {
    hydrate({ project, dancers, scenes, positions, requestedDancerId });
  }, [hydrate, project, dancers, scenes, positions, requestedDancerId]);

  const lastSeconds =
    scenes.length > 0 ? scenes[scenes.length - 1].timeSeconds : 0;

  /* 通し再生。主役ではないので、時計は素朴な rAF で足りる。

     以前は「曲が入っていれば曲を時計にする」分岐があったが、**見る人は
     曲を選べない**（2026-08-18 の決定）ので、この画面で曲が入ることは無い。
     分岐と、既に消えた部品を指すコメントだけが残っていたので落とした。 */
  useEffect(() => {
    if (!isPlaying) return;

    let frame = 0;
    let previous = performance.now();
    const step = (now: number) => {
      frame = requestAnimationFrame(step);
      const elapsed = (now - previous) / 1000;
      previous = now;

      const next = useViewerStore.getState().currentSeconds + elapsed;
      if (next >= lastSeconds) {
        setCurrentSeconds(lastSeconds);
        setIsPlaying(false);
        return;
      }
      setCurrentSeconds(next);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [isPlaying, lastSeconds, setCurrentSeconds, setIsPlaying]);

  /* 開けたリンクを端末に覚えておく。ホーム画面のアイコンは
     トップページを開くので、圏外だとここへ戻る道が無かった
     (2026-08-18、実機の報告 05-5)。覚えるのは開き方と題名だけで、
     振付そのものはサービスワーカーの控えから出る */
  useEffect(() => {
    if (!project) return;
    saveLastViewed({
      path: `${window.location.pathname}${window.location.search}`,
      title: project.title,
    });
  }, [project]);

  /* **振付師がクリックをオンにしていたら、見る人にも鳴らす**
     (2026-08-18、実機の要望)。音源そのものは共有しないが、クリックは
     作品の速さ(BPM)と拍子から合成できるので共有できる。
     鳴らすのは通しで再生している間だけ — 止まっている画面で鳴り続けると、
     稽古場では邪魔にしかならない */
  useMetronome({
    isActive: isPlaying && (project?.isMetronomeEnabled ?? false),
    bpm: project?.bpm ?? DEFAULT_BPM,
    beatsPerBar: project?.beatsPerBar ?? 4,
  });

  if (!hasChosen) return <ViewerEntry />;

  const dancer = dancers.find((item) => item.id === focusedDancerId);

  /* **1画面に収める**(2026-08-19、実機の要望)。
     横向きを捨てた（縦でしか見せない）ので、高さが読めるようになった。
     縦に流していた頃は、道順や帯を見るのに毎回スクロールが要った。

     割り当ては【ステージ優先】。ステージが余りを全部取り、その下に
     ボタン・道順の1行・帯を高さの決まった行として積む。
     並びは ステージ → ボタン → 道順 → 帯（実機の報告 06-10）。 */
  return (
    <div className="flex h-dvh flex-col overflow-hidden pb-[max(8px,env(safe-area-inset-bottom))]">
      {/* スマホを横にしたら、縦へ戻してもらう（2026-08-19、実機の報告）。
          出し分けは CSS だけ ― 向きを JS で見ると一度描いてから入れ替わる */}
      <RotateToPortraitNotice />
      <header className="flex h-target-lg shrink-0 items-center gap-unit px-gutter">
        <span className="min-w-0 flex-1 truncate text-headline text-fg-strong">
          {project.title}
        </span>
        {/* 自分のポジション。押すと入口へ戻って選び直せる。
            ここで focusDancer(null) を呼ぶと「全員」に変わるだけで、
            入口には二度と戻れなくなる(端末の記憶を消すしかなくなる)。

            **押せると分かる形にしてある**(2026-08-18、実機の報告 02-3)。
            以前は名前が並んでいるだけで、読み上げ用のラベルしか
            「選び直せる」と言っていなかった。**戻る道が無いように見えた**ので、
            下向きの山（開く印）を足した */}
        <PressableButton
          onClick={chooseAgain}
          aria-label={t.viewer.route.reselect}
          className="flex h-8 shrink-0 items-center gap-unit rounded-full bg-surface-raised px-3 font-mono text-mono-m text-fg"
        >
          {dancer ? (
            <>
              <span
                aria-hidden
                style={{ background: themedDancerColor(dancer.color) }}
                className="block h-1.5 w-1.5 rounded-full"
              />
              {dancer.name}
            </>
          ) : (
            t.viewer.route.everyone
          )}
          {/* **「変える」と書く**(2026-08-18、実機の報告 02-5)。
              山（⌄）だけでは「押すと選び直せる」と読めなかった。
              言葉で書くのがいちばん確実 */}
          <span className="shrink-0 text-caption text-fg-muted">
            {t.viewer.route.change}
          </span>
          <ChevronDown
            size={13}
            className="shrink-0 text-fg-muted"
            aria-hidden
          />
        </PressableButton>

        {/* シーン一覧への入口。1画面に収めたので、下の帯は「いまの前後」しか
            見えない。離れたシーンへ飛ぶ道をここに1本置く
            （実機の要望 2026-08-19） */}
        <ViewerSceneList />

        {/* 見る人にも意味のある表示だけを切り替える（実機の要望） */}
        <ViewerViewMenu />
      </header>

      {/* ステージが余りを全部取る。下の3行は高さが決まっているので、
          残りがそのままステージになる（`flex-1` ＋ `min-h-0`）。
          `min-h-0` を落とすと、中身の高さで押し出されてはみ出す */}
      <div className="flex min-h-0 flex-1 flex-col px-3.5">
        <div className="flex min-h-0 w-full flex-1 flex-col">
          <ViewerStage />
        </div>
      </div>

      {/* 再生と導線は、道順の帯より【もう一段上】に置く
          （実機の報告 06-10。ステージのすぐ下） */}
      <div className="flex shrink-0 items-center gap-unit px-3.5 pt-2">
        <PressableButton
          kind="icon"
          onClick={() => {
            if (currentSeconds >= lastSeconds) setCurrentSeconds(0);
            setIsPlaying(!isPlaying);
          }}
          aria-label={isPlaying ? t.viewer.route.stop : t.viewer.route.play}
          /* 主役はスクラブなので、再生は静かなボタンに格下げしてある */
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-raised text-fg"
        >
          {isPlaying ? (
            <Pause size={16} fill="currentColor" />
          ) : (
            <Play size={16} fill="currentColor" />
          )}
        </PressableButton>

        {/* 導線だけは切れるようにする。隊形だけ見たいことがある。
            格子・顔被り・シンメトリーは、見る人には要らない */}
        {focusedDancerId && (
          <PressableButton
            role="switch"
            aria-checked={isPathVisible}
            onClick={togglePath}
            className={`flex h-8 shrink-0 items-center gap-1.5 rounded-2xl border px-[11px] text-label ${
              isPathVisible
                ? "border-accent bg-accent/16 text-accent-soft"
                : "border-line-strong text-fg-muted"
            }`}
          >
            <Spline size={13} />
            {t.viewer.route.paths}
          </PressableButton>
        )}
      </div>

      {/* 道順の1行。ボタンの下、帯のすぐ上（実機の報告 06-10） */}
      <div className="shrink-0 px-3.5 pt-2">
        <ViewerRoute />
      </div>

      {/* シーンの帯はいちばん下。親指の届く所に置く。
          **等間隔に並べる**ので、時刻が近くてもコマは重ならない
          （実機の報告 06-11） */}
      <div className="shrink-0 px-3.5 pt-2">
        <ViewerSceneStrip />
      </div>
    </div>
  );
}
