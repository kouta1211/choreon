"use client";

import { useEffect } from "react";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useThemeStore } from "@/features/theme/store/useThemeStore";
import { resolveAppearance } from "@/features/theme/lib/themePreference";
import { DANCER_COLOR_PALETTE } from "@/features/dancer/constants";
import {
  buildThumbnailDataUrl,
  buildThumbnailDots,
} from "@/features/scene/lib/sceneThumbnail";
import type { Project } from "@/features/project/types";

/**
 * シーン一覧のミニチュアを作り、ストアへ入れる。エディタで1回だけ呼ぶ。
 *
 * 【なぜ作る場所が1箇所なのか】
 * 配置が変わるアクションは複数ある(移動・回転・ダンサーの追加削除・
 * シーンの複製・テンプレートの適用…)。作り直しを各アクションに書き足すと、
 * アクションが増えるたびに書き漏れて、古い絵が残る。ここは
 * 「positionsが変わったら作り直す」という1本の依存にして、
 * どのアクション経由で変わったかを気にしなくて済むようにしている。
 *
 * 【なぜテーマも見ているのか】
 * ダンサーの色はSupabaseに16進数で保存され、描画時に themedDancerColor で
 * `var(--dancer-N)` に読み替えている。ところがdataURLの中のSVGからは、
 * それを貼っているページのCSS変数が見えない。そのため焼くときには
 * 実測値(rgb(...))へ直す必要があり、その値はテーマによって変わる。
 * テーマを見ていないと、**テーマを変えても点の色だけが前のまま残る**。
 *
 * 焼くのは点の色だけで、背景と格子はミニチュア側の要素がCSS変数から
 * 描いている。古くなりうる範囲をできるだけ狭くするため。
 */
export function useSceneThumbnails(project: Project) {
  const scenes = useProjectStore((state) => state.scenes);
  const dancers = useProjectStore((state) => state.dancers);
  const positionsBySceneId = useProjectStore(
    (state) => state.positionsBySceneId,
  );
  const setThumbnails = useProjectStore((state) => state.setThumbnails);
  // 端末の既定ではなく「いまこの画面に当たっているテーマ」を見る
  // (プロジェクト単位の上書きが入っていると別の値になる)。
  //
  // resolveAppearanceの戻り値(オブジェクト)ではなくテーマidの文字列だけを
  // 返しているのは、セレクタが毎回新しいオブジェクトを作るとZustandが
  // 「状態が変わった」と誤検知して無限に再レンダーし続けるため
  // (canvas/constants.ts の EMPTY_POSITIONS と同じ理由)。
  // 点の色を左右するのはテーマだけで、質感(texture)は関係ない
  const themeId = useThemeStore(
    (state) => resolveAppearance(state.preference, state.projectId).theme,
  );

  const { stageWidth, stageHeight } = project;

  useEffect(() => {
    const resolveColor = createColorResolver();
    const next: Record<string, string> = {};

    for (const scene of scenes) {
      const dots = buildThumbnailDots(
        positionsBySceneId[scene.id] ?? {},
        dancers,
        stageWidth,
        stageHeight,
        resolveColor,
      );
      next[scene.id] = buildThumbnailDataUrl(dots, stageWidth, stageHeight);
    }

    setThumbnails(next);
    // themeIdは計算には使わないが、テーマが変わったら焼き直すために
    // 依存に入れている(同じ保存色でも、実測値はテーマごとに変わる)
  }, [
    scenes,
    dancers,
    positionsBySceneId,
    stageWidth,
    stageHeight,
    setThumbnails,
    themeId,
  ]);
}

/**
 * 保存されている6色を、いまのテーマでの実測値に直す関数を作る。
 *
 * getComputedStyleは呼ぶたびにレイアウトを読むので、6色ぶんを先に
 * 読んでおいて、あとは表引きにする(シーン数×人数ぶん呼ばれるため)。
 */
function createColorResolver(): (dancerColor: string) => string {
  const style = getComputedStyle(document.documentElement);
  const resolved = new Map<string, string>();

  DANCER_COLOR_PALETTE.forEach((color, index) => {
    const value = style.getPropertyValue(`--dancer-${index + 1}`).trim();
    // テーマがその変数を持っていなければ、保存されている色をそのまま使う
    resolved.set(color, value || color);
  });

  return (dancerColor) => resolved.get(dancerColor) ?? dancerColor;
}
