"use client";

import { useEffect } from "react";
import { List, Pause, Pencil, Play, Plus } from "lucide-react";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { MusicTimeline } from "@/components/organisms/MusicTimeline";
import { PlayheadClock } from "@/components/molecules/PlayheadClock";
import { useMusicStore } from "@/features/music/store/useMusicStore";
import {
  seekToSelectedScene,
  useMusicPlayback,
} from "@/features/music/hooks/useMusicPlayback";
import { useSilentClock } from "@/features/music/hooks/useSilentClock";
import { useMetronome } from "@/features/music/hooks/useMetronome";
import {
  nearestSceneIndexAtSeconds,
  sceneStartSeconds,
} from "@/features/music/lib/musicTimeline";
import { SceneListSheet } from "@/components/organisms/SceneListSheet";
import { useAddScene } from "@/features/scene/hooks/useAddScene";
import type { Project } from "@/features/project/types";
import { sceneDurations } from "@/features/scene/lib/sceneTiming";

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
  const { addScene: handleAddScene, isCreating } = useAddScene(project);
  const scenes = useProjectStore((state) => state.scenes);
  const selectedSceneId = useUIStore((state) => state.selectedSceneId);
  const selectScene = useUIStore((state) => state.selectScene);
  const isPlaying = useUIStore((state) => state.isPlaying);
  const setIsPlaying = useUIStore((state) => state.setIsPlaying);
  const setSceneSheetOpen = useUIStore((state) => state.setSceneSheetOpen);
  const musicUrl = useMusicStore((state) => state.objectUrl);
  const musicFileName = useMusicStore((state) => state.fileName);
  const setMusicDuration = useMusicStore((state) => state.setDurationSeconds);
  const bpm = useMusicStore((state) => state.bpm);
  const isMetronomeEnabled = useMusicStore((state) => state.isMetronomeEnabled);
  const setCurrentTime = useMusicStore((state) => state.setCurrentTime);
  const musicDuration = useMusicStore((state) => state.durationSeconds);
  const hasMusic = musicUrl !== null;
  const audioRef = useMusicPlayback();

  const durations = sceneDurations(scenes);
  // 時刻表示の分母。曲が入っていれば曲の長さ、無ければ最後のシーンまで
  const totalSeconds = Math.max(
    musicDuration ?? 0,
    scenes[scenes.length - 1]?.timeSeconds ?? 0,
  );
  const selectedIndex = scenes.findIndex((s) => s.id === selectedSceneId);
  const selectedScene = selectedIndex >= 0 ? scenes[selectedIndex] : null;

  // 曲が無いときの時計。曲があるときは<audio>が時刻の正になる
  // (useMusicPlayback)。どちらのモードでも「時刻 → シーン」と一方向に
  // 流れるので、時計は常に1つだけになる
  useSilentClock();
  useMetronome({
    isActive: isPlaying && !hasMusic && isMetronomeEnabled,
    bpm,
  });

  // 手でシーンを選んだら曲もその位置へ飛ばす。再生中は曲の側が
  // シーンを決めているので、止まっているときだけ動かす
  useEffect(() => {
    if (isPlaying) return;
    seekToSelectedScene(audioRef.current);
  }, [isPlaying, selectedSceneId, audioRef]);

  const handleTogglePlay = () => {
    if (!isPlaying) {
      // 選択中のシーンの時刻から始める。曲があれば<audio>側が
      // seekToSelectedScene で既にそこへ寄っている
      if (!hasMusic && selectedIndex >= 0) {
        setCurrentTime(sceneStartSeconds(scenes)[selectedIndex] ?? 0);
      }
      setIsPlaying(true);
      return;
    }

    // 止めるときは、いちばん近いシーンへ寄せてから止める。
    // 押した瞬間の時刻は区間の途中であることが多く、そこで止めると
    // 「シーン2と3のあいだ」という、隊形としては存在しない状態で残る。
    // 次に押したときにどこから続くのかも分からなくなる
    if (scenes.length > 0) {
      const audio = audioRef.current;
      const offset =
        useProjectStore.getState().project?.musicOffsetSeconds ?? 0;
      const elapsed = hasMusic
        ? (audio?.currentTime ?? 0) - offset
        : useMusicStore.getState().currentTime;

      const index = nearestSceneIndexAtSeconds(scenes, elapsed);
      const scene = scenes[index];
      if (scene) {
        selectScene(scene.id);
        const start = sceneStartSeconds(scenes)[index];
        if (hasMusic && audio) audio.currentTime = offset + start;
        else setCurrentTime(start);
      }
    }
    setIsPlaying(false);
  };

  return (
    <div className="rounded-t-[calc(var(--radius)*1.5)] border-t border-line bg-surface pt-2.5 pb-3 md:rounded-none">
      {/* 持ち手。シートが下から出てくることを形で示す。狭い画面だけ
          (広い画面では一覧が横に常時出ていて、開く相手が無い) */}
      <button
        type="button"
        onClick={() => setSceneSheetOpen(true)}
        aria-label="シーン一覧を開く"
        className="mx-auto mb-2.5 block h-1 w-9 rounded-full bg-line-strong md:hidden"
      />

      {/* シーンが1つも無い状態でも、追加と一覧のボタンだけは出す
          (ここから作り始めるため。以前はストリップの中に「+」があった) */}
      <div className="flex items-center gap-2.5 px-3.5">
        {selectedScene ? (
          <>
            <button
              type="button"
              onClick={handleTogglePlay}
              aria-label={isPlaying ? "再生を停止" : "最後のシーンまで再生"}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg"
            >
              {isPlaying ? (
                <Pause size={16} fill="currentColor" />
              ) : (
                <Play size={16} fill="currentColor" />
              )}
            </button>

            {/* いま何を見ているかの表示。名前そのものは押せないままにして
                いる(触ったつもりの無い改名を防ぐ。SceneListのカードと同じ
                方針)。代わりに鉛筆を隣へ出し、開いているシーンの詳細設定へ
                一覧を経由せずに入れるようにしている */}
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-1.5">
                <span className="shrink-0 font-mono text-[11px] font-semibold text-accent-soft">
                  {String(selectedIndex + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 truncate text-sm font-semibold text-fg-strong">
                  {selectedScene.name}
                </span>
                <button
                  type="button"
                  onClick={() => setSceneSheetOpen(true)}
                  aria-label={`「${selectedScene.name}」の設定を開く`}
                  className="flex h-6 w-6 shrink-0 translate-y-0.5 items-center justify-center rounded-[calc(var(--radius)*0.5)] border border-line-strong text-fg-muted"
                >
                  <Pencil size={11} />
                </button>
              </div>
              {/* 時刻は【いま再生している位置】。選択中シーンの時刻ではなく
                  再生位置を出すのは、時間軸を触ってシークしたときに
                  どこまで進んだかを読む先がここしか無いため */}
              <span className="mt-0.5 block truncate font-mono text-[10.5px] text-fg-muted">
                <PlayheadClock
                  totalSeconds={totalSeconds > 0 ? totalSeconds : null}
                />
                {selectedIndex > 0 && ` · ${durations[selectedIndex]}秒で移動`}
                {musicFileName && ` · ♪ ${musicFileName}`}
              </span>
            </div>
          </>
        ) : (
          <span className="min-w-0 flex-1 text-[13px] text-fg-muted">
            シーンがありません
          </span>
        )}

        <button
          type="button"
          onClick={handleAddScene}
          disabled={isCreating}
          aria-label="シーンを追加"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[calc(var(--radius)*0.75)] border border-line-strong text-fg-sub disabled:opacity-50"
        >
          <Plus size={17} />
        </button>

        {/* 以前はここが無地の細いバーで、押せることも、押すと何が出るのかも
            分からなかった。文字を出して行き先を名指しする */}
        <button
          type="button"
          onClick={() => setSceneSheetOpen(true)}
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-[calc(var(--radius)*0.75)] border border-line-strong px-2.5 text-[13px] font-medium whitespace-nowrap text-fg-sub md:hidden"
        >
          <List size={15} className="shrink-0" />
          一覧
        </button>
      </div>

      {/* 曲の時間軸。シーンは「曲の何秒目か」の位置に載る */}
      <div className="mt-2.5">
        <MusicTimeline project={project} audioRef={audioRef} />
      </div>

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
