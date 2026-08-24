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
      /* 押す邪魔をしない — 掴んで動かす操作は生きたままにする */
      className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-[max(0px,calc(var(--radius)-2px))]"
    >
      {/* ■ 1枚目：**舞台の地の色を塗り戻す**（user の指摘 2026-08-24:
             「アイコンをもっと薄くし、ステージも暗くして、もっと
             わかりやすくして」）。
             以前は幕（`--veil` ＝ 黒20%）を1枚だけだったので、
             **まだ誰も立っていないはずの隊形がうっすら見えていた**。
             ここを地の色で塗ると、人も方眼もまとめて沈む。
             生の黒ではなく**その舞台の地**を使うので、紙や黒板の
             テーマでも「暗くなる」ではなく「何も無い面になる」*/}
      <div
        aria-hidden
        className="absolute inset-0 rounded-[max(0px,calc(var(--radius)-2px))] bg-stage/92"
      />
      {/* ■ 2枚目：他の「隠す」場面と同じ幕。地よりもう一段沈ませて、
             **いま操作する面ではない**ことを出す */}
      <div
        aria-hidden
        className="absolute inset-0 rounded-[max(0px,calc(var(--radius)-2px))] bg-[var(--veil)]"
      />
      <p className="overlay-panel relative rounded-xl px-gutter py-2 text-label text-fg">
        {t.editor.beforeFirstScene}
      </p>
    </div>
  );
}
