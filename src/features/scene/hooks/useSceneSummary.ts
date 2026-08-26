"use client";

import { useProjectStore } from "@/features/project/store/useProjectStore";
import { countLengthLabel } from "@/features/music/lib/counts";
import { useT } from "@/features/i18n/LocaleProvider";

/**
 * シーン一覧の見出しに添える「何件か」と「通しで何カウントか」。
 *
 * ■ なぜ拍で出すのか（2026-08-26）
 * 以前は合計の秒数を出すか、順番だけのときは件数だけにしていた。
 * **カウントはどの作品でも意味を持つ**ので、出し分ける理由が消えた。
 * 通しの長さは**最後のシーンの位置**そのもの（拍の差）。
 *
 * 同じ文が**3箇所**（右のパネル・シート・左レール）に出るので、
 * 判断をここ1つに閉じ込める — 各所で書くと必ずどこかが取り残される。
 */
export function useSceneSummary(): string {
  const t = useT();
  const scenes = useProjectStore((state) => state.scenes);
  /* 並び順の正は位置なので、**最後の要素が最後とは限らない**。
     いちばん大きい拍を取る */
  const lastBeat = scenes.reduce(
    (max, scene) => Math.max(max, scene.positionBeats),
    0,
  );

  return t.editor.scenes.summary(scenes.length, countLengthLabel(lastBeat));
}
