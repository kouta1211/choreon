"use client";

import { useState } from "react";

import { loadGuestDraft } from "@/features/project/lib/guestDraft";
import { EditorLayout } from "@/components/templates/EditorLayout";
import { createGuestProject } from "@/features/project/lib/guestProject";
import { useT } from "@/features/i18n/LocaleProvider";

/**
 * 未ログインのまま触れるエディタ。
 *
 * 「まず登録してください」から始めると、何ができるアプリか分からないまま
 * 判断を迫ることになる。先に作ってもらい、残したくなった時点で登録を
 * 求める(保存＝登録の壁)。
 *
 * 中身はメモリの上だけにあり、Supabaseへは一切書き込まない。
 * その判定はpersist()が1箇所で行う(features/project/lib/persistence.ts)。
 *
 * useStateの初期化関数で1回だけ種を作っている。単なる定数ではなく
 * 「マウント時に1回だけ計算して以後固定したい値」なので、
 * useMemoではなくこちらが正しい(useMemoは再計算されうる前提の最適化で、
 * 同一性を保証するものではない)。種のIDは固定値にしてあるため、
 * サーバー描画とブラウザ描画で食い違うこともない。
 */
export function GuestEditor() {
  const t = useT();
  /* 残してある下書きがあれば、そちらから始める。無いときだけ種を作る。
     **useState の初期化関数なのでブラウザで1回だけ走る** — サーバー側では
     localStorage を読めないので、種で描いてから差し替えるのではなく、
     ここで一度に決める（Guest 側は動的に描かれるため食い違わない） */
  const [snapshot] = useState(
    () =>
      loadGuestDraft() ??
      createGuestProject({
        title: t.projects.guestTitle,
        sceneName: t.projects.sceneName,
      }),
  );

  return (
    <EditorLayout
      project={snapshot.project}
      initialDancers={snapshot.dancers}
      initialScenes={snapshot.scenes}
      initialPositions={snapshot.positions}
      isGuest
    />
  );
}
