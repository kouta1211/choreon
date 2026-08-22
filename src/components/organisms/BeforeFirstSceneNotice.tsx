"use client";

import { useMusicStore } from "@/features/music/store/useMusicStore";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { isBeforeFirstScene } from "@/features/music/lib/beforeFirstScene";
import { useT } from "@/features/i18n/LocaleProvider";

/**
 * 曲が先に鳴っていて、まだ最初のシーンへ着いていない間の板。
 *
 * ■ なぜ出すのか（user の指示 2026-08-22）
 * 音先のダンスショーケースがある。以前はその間も**最初の隊形が出て
 * いた**ので、まだ誰も立っていないはずの時間に人が並んでいて、
 * **振付が始まる瞬間**も見えなかった。
 *
 * ■ 1フレームごとに描き直さない
 * 読むのは時計そのものではなく、**「最初のシーンより前か」という
 * 真偽値**。ここが入れ替わるのは1回だけなので、再生中ずっと描き直しが
 * 走ることにはならない（ステージ全体が巻き添えになる）。
 */
export function BeforeFirstSceneNotice() {
  const t = useT();
  const hasMusic = useMusicStore((state) => state.objectUrl !== null);
  const scenes = useProjectStore((state) => state.scenes);
  /* 読むのは時計そのものではなく**真偽値**。ここが入れ替わるのは1回だけ
     なので、再生中ずっと描き直しが走ることにはならない。
     判断そのものは lib の純粋関数が持つ（テストもそちら側） */
  const isBefore = useMusicStore((state) =>
    isBeforeFirstScene(scenes, state.currentTime),
  );

  if (!hasMusic || !isBefore) return null;

  return (
    <div
      /* 幕は他の「隠す」場面と同じ材質（フォーカス中の veil）。
         押す邪魔をしない — 掴んで動かす操作は生きたままにする */
      className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-[max(0px,calc(var(--radius)-2px))] bg-[var(--veil)]"
    >
      <p className="overlay-panel rounded-xl px-gutter py-2 text-label text-fg">
        {t.editor.beforeFirstScene}
      </p>
    </div>
  );
}
