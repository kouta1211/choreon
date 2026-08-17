"use client";

import { useProjectStore } from "@/features/project/store/useProjectStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useSceneActions } from "@/features/scene/hooks/useSceneActions";
import { comfortableSeconds } from "@/features/canvas/lib/physicalLimits";
import type { MoveStrain } from "@/features/canvas/lib/physicalLimits";

/**
 * 「移動が速すぎます」の直しを、その場で当てられるようにする。
 *
 * ■ アプリはもう答えを日本語で言っていた
 * 警告の説明文はこう書いてある —「時間軸でこのシーンを右へ引くと、移動に
 * 使える時間が延びます」。**やることは決まっていて、手数だけが残っていた。**
 * ここはその一文をボタンにするだけで、新しい判断は増えていない。
 *
 * ■ 押されるまで何も起きない
 * 秒数を返すのと、当てるのを分けてある。指摘を読んで「これは意図した速さ
 * だから直さない」と決められるのが要点で、勝手に直してはいけない。
 * 当てたあとも **元に戻す1回**で消える(retime を履歴へ積んでいる)。
 *
 * ■ 以降のシーンも一緒にずらす(ripple)
 * この区間だけ延ばすと次のシーンを追い越して順番が入れ替わる。
 * 「間に合わないから時間をください」という直しなので、後ろへ送る方が
 * 意図に近い。
 *
 * ■ どのシーンか、を渡せる
 * 作品ぜんぶを見てもらうと、**指摘の相手が「いま開いていないシーン」**に
 * なる。開いているシーンを前提にすると、押した瞬間に**別の区間が延びる**。
 * 既定はいま開いているシーンのまま（印から押す道は変わらない）。
 */
export function useExtendMoveTime() {
  const scenes = useProjectStore((state) => state.scenes);
  const selectedSceneId = useUIStore((state) => state.selectedSceneId);
  const { changeSegmentSeconds } = useSceneActions();

  /** 速すぎる移動は「そのシーン → 次のシーン」なので、延ばすのは次の側 */
  const nextSceneOf = (sceneId: string | null) => {
    const index = scenes.findIndex((scene) => scene.id === sceneId);
    return index >= 0 ? (scenes[index + 1] ?? null) : null;
  };

  const suggestFor = (
    strain: MoveStrain,
    sceneId: string | null = selectedSceneId,
  ): number | null => {
    if (!nextSceneOf(sceneId)) return null;
    const seconds = comfortableSeconds(strain.distanceMeters);
    // 既にそれ以上の時間があるなら、延ばす提案にならない
    return seconds > strain.seconds ? seconds : null;
  };

  const extendTo = async (
    seconds: number,
    sceneId: string | null = selectedSceneId,
  ) => {
    const nextScene = nextSceneOf(sceneId);
    if (!nextScene) return;
    await changeSegmentSeconds(nextScene, seconds, true, true);
  };

  return {
    suggestFor,
    extendTo,
    canExtend: nextSceneOf(selectedSceneId) !== null,
  };
}
