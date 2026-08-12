"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useMotionValue, type MotionValue } from "motion/react";

/**
 * ステージを横にドラッグしている最中の「どこまで進んだか」を配るための入れ物。
 *
 * 進捗をReactのstateに置いていない理由:
 * pointermoveは指1回の払いで数十回飛ぶ。そのたびにstateを更新すると、
 * ステージ上のダンサーの数だけコンポーネント関数が再実行される。
 * MotionValueなら購読している要素のスタイルだけが書き換わり、
 * Reactのレンダーを一度も起こさずに済む
 * (DraggableDancerIconが位置の保持に既にMotionValueを使っているのと同じ理由)。
 *
 * 一方「どのシーンへ向かっているか」はstateで持つ。こちらは指の向きが
 * 変わった時にしか変わらず、変わったときには実際に描くものが増減する
 * (移動先にしか居ないダンサーが現れる)ため、レンダーが必要になる。
 */
type SceneScrubValue = {
  /** 0〜1。0=今のシーンのまま、1=移動先の隊形にぴったり重なった状態 */
  progress: MotionValue<number>;
  /** 指が向かっている先のシーン。掴んでいない間と、その向きに
   * シーンが無い(端)ときはnull */
  targetSceneId: string | null;
  setTargetSceneId: (sceneId: string | null) => void;
};

const SceneScrubContext = createContext<SceneScrubValue | null>(null);

export function SceneScrubProvider({ children }: { children: ReactNode }) {
  const progress = useMotionValue(0);
  const [targetSceneId, setTargetSceneId] = useState<string | null>(null);

  const value = useMemo(
    () => ({ progress, targetSceneId, setTargetSceneId }),
    [progress, targetSceneId],
  );

  return (
    <SceneScrubContext.Provider value={value}>
      {children}
    </SceneScrubContext.Provider>
  );
}

/**
 * Providerの外でも呼べる。ステージのスクラブはエディタ画面だけの機能で、
 * ダンサーのアイコン自体は他の場所(テンプレートの下見など)でも描くため、
 * 「スクラブしていない」状態を返して素通りさせる。
 */
export function useSceneScrub(): SceneScrubValue | null {
  return useContext(SceneScrubContext);
}
