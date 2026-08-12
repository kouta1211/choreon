"use client";

import { useEffect } from "react";

import { CanvasBoard } from "@/components/organisms/CanvasBoard";
import { EditorHeader } from "@/components/organisms/EditorHeader";
import { AddDancerSheet } from "@/components/organisms/AddDancerSheet";
import { TemplateSheet } from "@/components/organisms/TemplateSheet";
import { DancerInspector } from "@/components/organisms/DancerInspector";
import { SceneDock } from "@/components/organisms/SceneDock";
import { SceneSidebar } from "@/components/organisms/SceneSidebar";
import { EditorSidePanel } from "@/components/organisms/EditorSidePanel";
import { EditorShortcuts } from "@/components/organisms/EditorShortcuts";
import { UnsavedChangesGuard } from "@/components/organisms/UnsavedChangesGuard";
import { useSceneThumbnails } from "@/features/scene/hooks/useSceneThumbnails";
import { SceneScrubProvider } from "@/features/canvas/hooks/useSceneScrub";
import { useMusicStore } from "@/features/music/store/useMusicStore";
import type { Project } from "@/features/project/types";
import type { Dancer } from "@/features/dancer/types";
import type { Position, Scene } from "@/features/scene/types";

type Props = {
  project: Project;
  initialDancers: Dancer[];
  initialScenes: Scene[];
  initialPositions: Position[];
  /** 未ログインの下書きとして開くかどうか(トップページのゲスト編集) */
  isGuest?: boolean;
};

/**
 * エディタ画面の配置だけを受け持つ層。ページ自体はスクロールさせず、
 * 画面の高さ(h-dvh)に収まる形で組む。幅によって3通り:
 *
 *   〜767px   1カラム … ステージ + 下部ドック。シーンとダンサーはシートで開く
 *   768〜1199 2ペイン … ステージ + 右パネル(シーン/ダンサーをタブで切替)
 *   1200px〜  3ペイン … 左レール(シーン) + ステージ + 右パネル(ダンサー)
 *
 * 最下端に貼り付けないのは、iOSのホームバーやWindowsのタスクバーと
 * 再生ボタンが重なるため(env(safe-area-inset-bottom)、最低24px)。
 *
 *   ヘッダー / 表示セグメント  … 高さ固定
 *   ステージ                  … flex-1(余った高さを全部もらう)
 *   インスペクター / ドック    … 高さ固定、下端に貼り付く
 *
 * 以前は全体を縦に積んでスクロールさせていたため、スマートフォンでは
 * 「タイムラインを見るとステージが画面外」「ステージを見るとタイムラインが
 * 画面外」という状態になり、このアプリの主目的である
 * 「時間軸と空間を同時に見る」ができていなかった。
 *
 * min-h-0 が随所に入っているのは、flexアイテムが既定で
 * min-height:auto = 中身より小さくならないため。これが無いと
 * ステージがドックを画面外へ押し出す。
 *
 * 保存済みのプロジェクト(/projects/[id])と、未ログインの下書き(/)の
 * 両方がこの層を使う。中身の出どころが違うだけで、編集の見た目と操作は
 * 完全に同じものにしたいため、ここに一本化している。
 */
export function EditorLayout({
  project,
  initialDancers,
  initialScenes,
  initialPositions,
  isGuest = false,
}: Props) {
  // シーン一覧のミニチュアはここで1回だけ作る。ドックのストリップ・
  // ボトムシート・サイドバーの3箇所が同じ絵を使うので、置き場所は
  // それら全部を含むこの層になる
  useSceneThumbnails(project);

  // この端末に控えてある曲を戻す。作品ごとに1曲なので、別の作品を開いたら
  // 入れ替わる(useMusicStore.restore)。音源はサーバーへ上げていないので、
  // 共有された相手の端末では何も戻らない
  const restoreMusic = useMusicStore((state) => state.restore);
  useEffect(() => {
    void restoreMusic(project.id);
  }, [restoreMusic, project.id]);

  return (
    <SceneScrubProvider>
      <div className="flex h-dvh flex-col overflow-clip pb-[max(24px,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col overflow-clip md:max-[1199px]:max-w-3xl min-[1200px]:max-w-[1400px]">
          <EditorHeader project={project} />

          <div className="flex min-h-0 flex-1 gap-3 px-3.5 pb-1 md:gap-4 md:px-4">
            {/* 3ペインのときだけ、シーンを左のレールに出す */}
            <div className="hidden min-[1200px]:flex min-[1200px]:min-h-0">
              <SceneSidebar project={project} />
            </div>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <CanvasBoard
                project={project}
                initialDancers={initialDancers}
                initialScenes={initialScenes}
                initialPositions={initialPositions}
                isGuest={isGuest}
              />
            </div>

            {/* 2ペインはシーン/ダンサーをタブで、3ペインはダンサー専用。
              どちらを出すかはCSSでしか判定できないため両方描いて切り替える
              「768以上かつ1199以下」を範囲で指定している。
              `md:flex` と `min-[1200px]:hidden` を並べる書き方では、
              どちらが後にCSSへ出るかに結果が左右されてしまう
              (テーマに足したブレークポイントは md より前に出た) */}
            <div className="hidden md:max-[1199px]:flex md:max-[1199px]:min-h-0">
              <EditorSidePanel project={project} showScenes />
            </div>
            <div className="hidden min-[1200px]:flex min-[1200px]:min-h-0">
              <EditorSidePanel project={project} showScenes={false} />
            </div>
          </div>

          {/* インスペクターとヒントはドックの直上に浮かせる(absolute)ため、
            位置の基準としてこのラッパーが要る。ダンサーを選んでいる間は
            インスペクターが同じ場所を使うので、ヒントは出さない */}
          <div className="relative shrink-0">
            <DancerInspector />
            <SceneDock project={project} />
          </div>

          <AddDancerSheet project={project} />
          <TemplateSheet project={project} />
          <EditorShortcuts />
          <UnsavedChangesGuard />
        </div>
      </div>
    </SceneScrubProvider>
  );
}
