"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Pause, Play, Spline } from "lucide-react";
import { useViewerStore } from "@/features/viewer/store/useViewerStore";
import { saveLastViewed } from "@/features/viewer/lib/lastViewed";
import { ViewerEntry } from "@/components/organisms/ViewerEntry";
import { ViewerStage } from "@/components/organisms/ViewerStage";
import { ViewerScrub } from "@/components/organisms/ViewerScrub";
import { ViewerRoute } from "@/components/organisms/ViewerRoute";
import { PressableButton } from "@/components/atoms/PressableButton";
import { useMusicStore } from "@/features/music/store/useMusicStore";
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
  const [isPlaying, setIsPlaying] = useState(false);
  const hasMusic = useMusicStore((state) => state.objectUrl !== null);

  useEffect(() => {
    hydrate({ project, dancers, scenes, positions, requestedDancerId });
  }, [hydrate, project, dancers, scenes, positions, requestedDancerId]);

  const lastSeconds =
    scenes.length > 0 ? scenes[scenes.length - 1].timeSeconds : 0;

  // 通し再生。主役ではないので、時計は素朴な rAF で足りる。
  // ただし曲が入っているときは【曲が時計】になる(ViewerMusic)ので、
  // こちらは動かさない。2つの時計が同じ値を奪い合うと、再生位置が震える
  useEffect(() => {
    if (!isPlaying || hasMusic) return;

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
  }, [isPlaying, hasMusic, lastSeconds, setCurrentSeconds]);

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

  /* **1画面に収めようとしない**(2026-08-18、実機の要望)。
     以前は h-dvh で切り捨てていたので、横向きのスマホではステージが
     小さくなるしかなかった。この画面の用途は【自分の位置と道順を
     確かめる】ことなので、ステージを大きく取り、入りきらない分は
     下へ流す（スクロールしてよい）。 */
  return (
    <div className="flex min-h-dvh flex-col pb-[max(24px,env(safe-area-inset-bottom))]">
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
          <ChevronDown size={13} className="shrink-0 text-fg-muted" aria-hidden />
        </PressableButton>
      </header>

      {/* **横並びは 1024px から**(2026-08-18、実機の要望)。
          md(768px)にすると横向きのスマホ(844px)まで横並びになり、
          ステージが幅を道順に取られて小さくなる。この画面の用途は
          【確かめる】ことなので、**スマホの横向きは縦積みにして
          ステージを最大に取り、入りきらない分は下へ流す**。
          タブレット以上は高さもあるので、これまで通り横並び。

          広い画面では、ステージの右に道順を置く。
          **justify-center を入れてある** — 入れないと、ステージが 640px で
          頭打ちになったあとの余りが右端に溜まり、ステージ＋道順の塊が
          画面の左に寄る。広い画面ほど左に寄って見えるので、
          「ステージを真ん中に」という指摘になった */}
      <div className="flex flex-col items-center gap-2 px-3.5 min-[1024px]:flex-row min-[1024px]:items-start min-[1024px]:justify-center">
        {/* Stage は「親の高さいっぱいに伸びて、そこから幅を決める」作り。
            ここを items-center の横フレックスにすると、Stage が交差軸で
            伸びずに中身(ラベル)の高さまで縮み、盤面が高さ0になって
            【ステージが消える】。縦フレックスのまま渡す */}
        {/* **高さを明示する。** Stage は「親の高さいっぱい(h-full)から
            aspect-ratio で幅を決める」作りなので、親の高さが不定だと
            0 に潰れる(min-h-dvh へ変えた直後、実際に潰れた)。
            140vw を上限520pxで頭打ちにしてある。ふつうのスマホでは上限に
            当たって520px、うんと狭い端末では画面幅なりに縮む。
            上限を置くのは、広い画面でステージだけが間延びしないため */}
        <div
          className="flex h-[min(140vw,520px)] w-full min-w-0 flex-col min-[1024px]:flex-1"
          style={{ maxWidth: "min(100%, 640px)" }}
        >
          <ViewerStage />
        </div>

        {/* 道順と、下の道具。**横向きではここが右の列になる**
            (2026-08-18、実機の報告 05-2)。

            以前は下の道具を外側に置いていたので、横向きのスマホ(高さ390px)で
            ヘッダー56px＋道具200pxに挟まれ、**ステージに130pxしか残らず
            盤面が潰れて「バックステージ」と「客席側」の札が重なっていた**。
            横向きは高さが足りず幅が余るので、縦に積むのをやめて右へ寄せる。
            縦向きでは flex-col のままなので、並びはこれまでと変わらない。 */}
        <div className="flex w-full shrink-0 flex-col gap-2 min-[1024px]:w-[340px] min-[1024px]:justify-center">
          <ViewerRoute />

          {/* **見る人は曲を選べない**(2026-08-18、実機の要望)。
              以前は「同じ曲をこの端末で選ぶ」を出していたが、見る人の仕事は
              自分の道順を確かめることで、曲を用意することではない。
              時間の目盛りは作品の BPM と拍子（どちらも共有される）から引ける。
              音そのものが要る場合は、振付師側の設定を引き継ぐ形にする
              — いまはその設定が作品に入っていないので、次の課題 */}
          <ViewerScrub />

          <div className="mt-unit flex items-center gap-unit">
          <PressableButton
            kind="icon"
            onClick={() => {
              if (currentSeconds >= lastSeconds) setCurrentSeconds(0);
              setIsPlaying((playing) => !playing);
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
        </div>
      </div>
    </div>
  );
}
