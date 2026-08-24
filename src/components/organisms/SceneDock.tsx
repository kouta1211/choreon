"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  AudioLines,
  ChevronDown,
  List,
  Music4,
  Pause,
  Pencil,
  Play,
  Plus,
} from "lucide-react";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { MusicTimeline } from "@/components/organisms/MusicTimeline";
import { SceneStrip } from "@/components/organisms/SceneStrip";
import { useOrderOnlyTimeline } from "@/features/scene/hooks/useOrderOnlyTimeline";
import { PlayheadClock } from "@/components/molecules/PlayheadClock";
import { CountInOverlay } from "@/components/organisms/CountInOverlay";
import { useMusicStore } from "@/features/music/store/useMusicStore";
import {
  seekToSelectedScene,
  useMusicPlayback,
} from "@/features/music/hooks/useMusicPlayback";
import { useSilentClock } from "@/features/music/hooks/useSilentClock";
import { useMetronome } from "@/features/music/hooks/useMetronome";
import { playbackStartIndex } from "@/features/music/lib/playbackStart";
import { useBpm } from "@/features/music/hooks/useBpm";
import { usePlaybackToggle } from "@/features/music/hooks/usePlaybackToggle";
import { useToastOffset } from "@/components/hooks/useToastOffset";
import { SceneListSheet } from "@/components/organisms/SceneListSheet";
import { useAddScene } from "@/features/scene/hooks/useAddScene";
import type { Project } from "@/features/project/types";
import { sceneDurations } from "@/features/scene/lib/sceneTiming";
import { PressableButton } from "@/components/atoms/PressableButton";
import { useT } from "@/features/i18n/LocaleProvider";
import { useMetronomeSetting } from "@/features/music/hooks/useMetronomeSetting";

type Props = {
  project: Project;
};

/**
 * 画面下端に貼り付く、時間軸側の操作。3段:
 *
 *   1. 持ち手 … 押すとシーン一覧のシートが開く
 *   2. 操作行 … 再生 / いま何番のどのシーンか / シーンを追加 / 一覧を開く
 *   3. 時間軸 … 曲の波形の上に、シーンのコマを時刻どおりに置いたもの
 *              (その下に曲全体を示すミニマップ)
 *
 * ここは【見る場所】に徹していて、シーン名を書き換える操作は持たない。
 * それらはシーン一覧(SceneList)のカードにある。時刻だけは、時間軸の上で
 * コマを横へ動かして決められる。
 *
 * ■ ストリップ(等間隔のコマ列)をやめた理由
 * シーンが時刻を持つようになったので、等間隔に並べると 0秒・5秒・5.1秒・
 * 6秒のような配置が均等に見え、どこが詰まっているかが読めなくなった。
 * いまは横位置がそのまま時刻で、間隔がそのまま移動時間になっている。
 *
 * 一覧のボタンは狭い画面だけに出す(md:hidden)。広い画面では
 * シーン一覧が横のサイドバーに常時出ていて、そちらに同じ操作があるため。
 *
 * 再生(isPlaying)は、選択中シーンから最後のシーンまで自動的に進む
 * シーケンサー。selectSceneを呼ぶと、その瞬間にDraggableDancerIcon側が
 * x/yの変化を検知してtransitionDurationSecondsかけて自分で補間
 * アニメーションを始める(つまり「選択する」ことと「そこへ向けて動き
 * 始める」ことは同時に起きる)。そのためこのシーケンサーは「今のシーンへ
 * 到着するアニメーションが終わるまで待ってから次を選ぶ」を繰り返せばよい。
 * 再生ボタンを押した直後(まだ何のアニメーションも進行していない)だけは
 * 待たずに即座に最初の一歩を進める(justStartedPlayingRefで区別している。
 * ここで律儀に「現在シーンのdurationぶん待つ」をしてしまうと、そもそも
 * まだ動き始めてすらいないのに無意味な間が空いてしまう)。
 */
export function SceneDock({ project }: Props) {
  const t = useT();
  const {
    addScene: handleAddScene,
    isCreating,
    canAdd: canAddScene,
  } = useAddScene(project);
  const scenes = useProjectStore((state) => state.scenes);
  const selectedSceneId = useUIStore((state) => state.selectedSceneId);
  const isPlaying = useUIStore((state) => state.isPlaying);
  const setSceneSheetOpen = useUIStore((state) => state.setSceneSheetOpen);
  const musicUrl = useMusicStore((state) => state.objectUrl);
  const musicFileName = useMusicStore((state) => state.fileName);
  const setMusicDuration = useMusicStore((state) => state.setDurationSeconds);
  // 速さ・拍子・頭出しは【storeから読む】。props の project は
  // ページが取ってきたときのままで、シートで変えても更新されない。
  // props を読んでいると、鳴っているメトロノームだけが古い速さのままになる
  const { bpm, beatsPerBar } = useBpm();
  const offsetSeconds = useProjectStore(
    (state) => state.project?.musicOffsetSeconds ?? project.musicOffsetSeconds,
  );
  /* メトロノームは作品の設定になった(2026-08-18)。端末ごとではない */
  const { isMetronomeEnabled, toggleMetronome } = useMetronomeSetting();
  /* 時刻という概念を出すかどうか。曲も拍も無いときは出さない */
  const isOrderOnly = useOrderOnlyTimeline();
  const playbackStartSceneId = useUIStore(
    (state) => state.playbackStartSceneId,
  );
  const isTimelineVisible = useUIStore((state) => state.isTimelineVisible);
  const setMusicSheetOpen = useUIStore((state) => state.setMusicSheetOpen);
  const toggleTimelineVisible = useUIStore(
    (state) => state.toggleTimelineVisible,
  );
  const musicDuration = useMusicStore((state) => state.durationSeconds);
  const hasMusic = musicUrl !== null;
  const audioRef = useMusicPlayback();
  const dockRef = useRef<HTMLDivElement>(null);

  const durations = sceneDurations(scenes);
  // 時刻表示の分母。曲が入っていれば曲の長さ、無ければ最後のシーンまで
  const totalSeconds = Math.max(
    musicDuration ?? 0,
    scenes[scenes.length - 1]?.timeSeconds ?? 0,
  );
  const selectedIndex = scenes.findIndex((s) => s.id === selectedSceneId);
  const selectedScene = selectedIndex >= 0 ? scenes[selectedIndex] : null;
  // 曲が無ければカウントで読む。毎レンダー新しい入れ物を作ると
  // PlayheadClock の購読が張り直されるので、中身が同じなら使い回す
  const countSetting = useMemo(
    () => (hasMusic ? null : { bpm, originSeconds: offsetSeconds ?? 0 }),
    [hasMusic, bpm, offsetSeconds],
  );

  // 曲が無いときの時計。曲があるときは<audio>が時刻の正になる
  // (useMusicPlayback)。どちらのモードでも「時刻 → シーン」と一方向に
  // 流れるので、時計は常に1つだけになる
  useSilentClock();
  // 再生ボタンの中身(どこから流すか・止めるときにどこへ寄せるか・
  // スペースキーからの合図)は usePlaybackToggle が持つ
  const {
    toggle: handleTogglePlay,
    isCountingIn,
    remainingBeats,
  } = usePlaybackToggle({ scenes, bpm, hasMusic });
  useMetronome({
    // 予備拍の間は曲の有無に関わらず鳴らす。音の出ないカウントインは
    // ただの遅れで、構えるための合図にならない
    isActive: (isPlaying && !hasMusic && isMetronomeEnabled) || isCountingIn,
    isCountIn: isCountingIn,
    bpm,
    beatsPerBar,
  });

  /* 押したらどこから流れるか。選んでいるところが最後のシーンなら、
     前回始めた場所へ戻る(playbackStart.ts)。同じ判定をここでも
     引いて、押す前に読めるようにしている */
  const playFromLabel = useMemo(() => {
    const from = playbackStartIndex(
      scenes,
      selectedSceneId,
      playbackStartSceneId,
    );
    if (from < 0) return undefined;
    const fromScene = scenes[from];
    if (fromScene?.id === selectedSceneId) return t.editor.dock.playFromHere;
    return t.editor.dock.playFrom(fromScene?.name ?? "");
  }, [scenes, selectedSceneId, playbackStartSceneId, t]);

  // トーストはドックの直上に出す(高さを測ってCSS変数へ流す)
  useToastOffset(dockRef);

  /* 手でシーンを選んだら曲もその位置へ飛ばす。再生中は曲の側が
     シーンを決めているので、止まっているときは動かさない。

     **選び直したときだけ**動かす（2026-08-22）。以前は「止めた」だけでも
     ここが走り、選んでいるシーンの位置へ引き戻していた。そのせいで
     途中で止めて押し直すと最初から鳴り始めていた（user の報告）。
     再生中も控えを更新しておくので、止めた瞬間に走ることはない */
  const seekedSceneIdRef = useRef(selectedSceneId);
  useEffect(() => {
    if (isPlaying) {
      seekedSceneIdRef.current = selectedSceneId;
      return;
    }
    if (seekedSceneIdRef.current === selectedSceneId) return;
    seekedSceneIdRef.current = selectedSceneId;
    seekToSelectedScene(audioRef.current);
  }, [isPlaying, selectedSceneId, audioRef]);

  return (
    <div
      ref={dockRef}
      /* 常設の板なので、すりガラスは掛けない(ステージのドラッグ中ずっと
         背後の再合成が走り、指の追従が落ちる)。

         【左右のパネルと同じカードにする】(user の指示 2026-08-22)。
         以前は広い画面で面も枠も置かず、地の上に操作だけを並べていた
         (実機の報告 08-18)。だが左のシーン一覧・右のダンサーのパネルが
         どちらも囲われた面なので、**下だけ囲いが無い**状態になっていた。
         3つとも同じ材質・同じ角丸で囲う。

         面は `.card-surface`(globals.css)。テーマによって半透明だったり
         不透明だったりする面の色を、地の上へ重ねて必ず不透明にする
         (規約 frontend.md 2節3項)。上端の1本線を引かないのは今までどおり
         — 囲いは枠が持つので、中に区切り線は要らない */
      className="card-surface mx-gutter rounded-2xl border border-line pt-unit pb-unit"
    >
      {/* 持ち手。シートが下から出てくることを形で示す。狭い画面だけ
          (広い画面では一覧が横に常時出ていて、開く相手が無い) */}
      <PressableButton
        onClick={() => setSceneSheetOpen(true)}
        aria-label={t.editor.dock.openScenes}
        className="mx-auto mb-unit block h-1 w-9 rounded-full bg-line-strong md:hidden"
      />

      {/* シーンが1つも無い状態でも、追加と一覧のボタンだけは出す
          (ここから作り始めるため。以前はストリップの中に「+」があった) */}
      <div className="flex items-center gap-gutter px-gutter">
        {selectedScene ? (
          <>
            {/* 再生だけがアクセントで塗られる。ドックの中で
                「いま押すもの」が1つだと分かる */}
            <PressableButton
              kind="round"
              onClick={handleTogglePlay}
              aria-label={
                isCountingIn
                  ? t.editor.dock.cancelCountIn
                  : isPlaying
                    ? t.editor.dock.pause
                    : t.editor.dock.play
              }
              /* マウスを乗せたときに【どこから流れるか】を出す。
                 最後のシーンに居座ったまま押すと前回始めた場所へ戻る、
                 という決まり(playbackStart.ts)が画面のどこにも
                 書かれておらず、押してみるまで分からなかった */
              title={isPlaying || isCountingIn ? undefined : playFromLabel}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg"
            >
              {/* 数えている間の残り拍は、画面の真ん中に大きく出す
                  (CountInOverlay)。ボタンは 48px の丸で、構えながら
                  見る数字を置くには小さすぎた。ここでは「もう一度押せば
                  やめられる」ことだけを形で示す */}
              {isCountingIn ? (
                <Pause size={20} fill="currentColor" />
              ) : isPlaying ? (
                <Pause size={20} fill="currentColor" />
              ) : (
                <Play size={20} fill="currentColor" />
              )}
            </PressableButton>

            {/* いま何を見ているかの表示。名前そのものは押せないままにして
                いる(触ったつもりの無い改名を防ぐ。SceneListのカードと同じ
                方針)。代わりに鉛筆を隣へ出し、開いているシーンの詳細設定へ
                一覧を経由せずに入れるようにしている */}
            <div className="flex min-w-0 flex-1 flex-col gap-base">
              <div className="flex items-baseline gap-unit">
                <span className="shrink-0 font-mono text-mono-m text-accent-soft">
                  {String(selectedIndex + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 truncate text-headline text-fg-strong">
                  {selectedScene.name}
                </span>
                <PressableButton
                  onClick={() => setSceneSheetOpen(true)}
                  aria-label={t.editor.dock.sceneSettings(selectedScene.name)}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-surface-raised hover:text-fg"
                >
                  <Pencil size={14} />
                </PressableButton>
              </div>
              {/* 時刻は【いま再生している位置】。選択中シーンの時刻ではなく
                  再生位置を出すのは、時間軸を触ってシークしたときに
                  どこまで進んだかを読む先がここしか無いため。

                  順番だけで作っているときは秒を出さない。**代わりに
                  「何番目か」**を置く — この行を空にすると、再生中に
                  どこに居るのかを読む先が無くなる（実機の報告 17-3） */}
              <span className="block truncate font-mono text-mono-s text-fg-muted">
                {isOrderOnly ? (
                  t.editor.dock.scenePosition(selectedIndex + 1, scenes.length)
                ) : (
                  <>
                    <PlayheadClock
                      totalSeconds={totalSeconds > 0 ? totalSeconds : null}
                      counts={countSetting}
                    />
                    {selectedIndex > 0 &&
                      t.editor.dock.moveSeconds(durations[selectedIndex])}
                    {musicFileName && ` · ♪ ${musicFileName}`}
                  </>
                )}
              </span>
            </div>
          </>
        ) : hasMusic ? (
          /* シーンがまだ無くても、**曲があるなら流せる**（実機の報告
             2026-08-22）。曲に合わせて作る人は、まず聞いて置き所を決める。
             進む先が無いだけで、鳴らせない理由は無い */
          <>
            <PressableButton
              kind="round"
              onClick={handleTogglePlay}
              /* **「最後のシーンまで再生」ではない。** 進む先が無いので、
                 そう読み上げると嘘になる（流すのは曲だけ） */
              aria-label={
                isCountingIn
                  ? t.editor.dock.cancelCountIn
                  : isPlaying
                    ? t.editor.dock.pause
                    : t.editor.dock.playMusicOnly
              }
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg"
            >
              {isPlaying || isCountingIn ? (
                <Pause size={20} fill="currentColor" />
              ) : (
                <Play size={20} fill="currentColor" />
              )}
            </PressableButton>
            <span className="min-w-0 flex-1 text-label text-fg-muted">
              {isPlaying ? t.editor.musicOnly : t.editor.noScenes}
            </span>
          </>
        ) : (
          /* 曲も無ければ、流すものが本当に無い */
          <span className="min-w-0 flex-1 text-label text-fg-muted">
            {t.editor.noScenes}
          </span>
        )}

        {/* 追加と一覧は【1つの面にまとめる】。別々に枠を持たせると、
            再生と並んで押す的が3つ横並びになり、どれが主役か読めなくなる */}
        <div className="flex shrink-0 items-center gap-base rounded-lg bg-surface-raised p-base">
          <PressableButton
            kind="icon"
            onClick={handleAddScene}
            disabled={isCreating || !canAddScene}
            data-tour="add-scene"
            aria-label={t.editor.dock.addScene}
            /* 曲があるときは鳴らしている最中だけ。**押しても何も起きない**
               を作らないよう、押せない見た目にして理由を添える */
            title={
              canAddScene ? undefined : t.editor.dock.addSceneNeedsPlayback
            }
            className="flex h-10 w-10 items-center justify-center rounded-md text-fg-sub transition-colors hover:bg-surface-strong hover:text-fg disabled:opacity-50"
          >
            <Plus size={20} />
          </PressableButton>
          <span aria-hidden className="h-5 w-px bg-line md:hidden" />
          <PressableButton
            kind="icon"
            onClick={() => setSceneSheetOpen(true)}
            aria-label={t.editor.dock.openScenes}
            className="flex h-10 w-10 items-center justify-center rounded-md text-fg-sub transition-colors hover:bg-surface-strong hover:text-fg md:hidden"
          >
            <List size={20} />
          </PressableButton>
          {/* クリック(メトロノーム)。**鳴らしたいのは再生する瞬間**なので、
              その隣に置く。以前は「表示とモード → 曲」の中と、時間軸の
              下(曲が無いときだけ)の2箇所にしか無く、どちらも再生ボタンから
              遠かった。

              ■ 曲があるときは出さない(2026-08-17)
              最初は薄く出して理由を添えていたが、**使えないものを並べない**
              方を採った。曲のシートと時間軸の操作も曲があると出ないので、
              これで3箇所とも同じ振る舞いになる。
              (予備拍のクリック音は別の機能なので、曲があっても鳴る) */}
          {!hasMusic && (
            <>
              <span aria-hidden className="h-5 w-px bg-line" />
              <PressableButton
                kind="icon"
                role="switch"
                aria-checked={isMetronomeEnabled}
                onClick={toggleMetronome}
                aria-label={t.music.click}
                title={t.music.click}
                className={`flex h-10 w-10 items-center justify-center rounded-md transition-colors ${
                  isMetronomeEnabled
                    ? "bg-accent/16 text-accent-soft"
                    : "text-fg-sub hover:bg-surface-strong hover:text-fg"
                }`}
              >
                <AudioLines size={20} />
              </PressableButton>
            </>
          )}
          <span aria-hidden className="h-5 w-px bg-line" />
          {/* 曲。**時間軸の主役なのに、入口が畳んだメニューの中にしか
              無かった**ので、時間軸の隣にも出す。曲が入っていれば
              印を点ける(入っているかどうかを開かずに読めるように) */}
          <PressableButton
            kind="icon"
            onClick={() => setMusicSheetOpen(true)}
            aria-label={t.editor.view.music}
            className="relative flex h-10 w-10 items-center justify-center rounded-md text-fg-sub transition-colors hover:bg-surface-strong hover:text-fg"
          >
            <Music4 size={20} />
            {hasMusic && (
              <span
                aria-hidden
                className="absolute top-1.5 right-1.5 block h-1.5 w-1.5 rounded-full bg-accent"
              />
            )}
          </PressableButton>
          <span aria-hidden className="h-5 w-px bg-line" />
          {/* 時間軸を畳む。PCでは帯が画面の1/4ほどを占めるので、
              時間の並びが要らないときに畳めるとステージが広く使える。
              閉じたことが分かるよう、向きの変わる山形1つで示す */}
          <PressableButton
            kind="icon"
            aria-expanded={isTimelineVisible}
            onClick={toggleTimelineVisible}
            aria-label={
              isTimelineVisible
                ? t.editor.dock.hideTimeline
                : t.editor.dock.showTimeline
            }
            className="flex h-10 w-10 items-center justify-center rounded-md text-fg-sub transition-colors hover:bg-surface-strong hover:text-fg"
          >
            <ChevronDown
              size={20}
              className={`transition-transform ${isTimelineVisible ? "" : "-rotate-180"}`}
            />
          </PressableButton>
        </div>
      </div>

      {/* 下の帯。**合わせる相手があるかどうか**で姿が変わる。
          - 曲か拍がある … 時間軸（横位置がそのまま時刻）
          - どちらも無い … 等間隔の帯（時刻という概念を出さない）
          決めるのは useOrderOnlyTimeline。理由は lib/timelineMode にある。

          畳んでいるときは【描かない】 — 高さ0で隠すだけだと、中の
          時間軸が毎フレーム測り直しに走る */}
      {isTimelineVisible && (
        /* 上の余白は、カードの下の余白（pb-gutter）と**同じ段**にする。
           以前は mt-2.5（10px）で、下が 16px だったので帯が上に寄って
           見えていた（2026-08-24 に user の指摘で実測）。
           帯の側はさらに上下 4px を自分で持っている（SceneStrip の
           pt-1 / pb-1）ので、そちらも足し引きが揃う */
        <div className="mt-gutter">
          {isOrderOnly ? (
            <SceneStrip project={project} />
          ) : (
            <MusicTimeline project={project} audioRef={audioRef} />
          )}
        </div>
      )}

      {/* 数えている間の幕。画面ごと数える */}
      <CountInOverlay
        isCountingIn={isCountingIn}
        remainingBeats={remainingBeats}
        onCancel={handleTogglePlay}
      />

      {/* 画面全体に重なるシート(狭い画面用)。DOM上の位置は見た目に
          影響しないのでここから描く。広い画面では一覧ボタンを出さないため
          開かれることがなく、代わりにステージ横のサイドバーが担う */}
      <SceneListSheet project={project} />

      {/* 曲の実体。画面には出さないが、再生位置を持つのはこの要素なので
          描画の外(useEffect)からは作れない。src が無い間は何も読み込まない */}
      {musicUrl && (
        <audio
          ref={audioRef}
          src={musicUrl}
          preload="auto"
          onLoadedMetadata={(event) =>
            setMusicDuration(event.currentTarget.duration)
          }
        />
      )}
    </div>
  );
}
