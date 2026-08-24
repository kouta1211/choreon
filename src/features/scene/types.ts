export type Scene = {
  id: string;
  projectId: string;
  name: string;
  orderIndex: number;
  /** この隊形が曲の何秒目にあたるか。
   * 区間の長さは「次のシーンの時刻 − このシーンの時刻」で毎回求める
   * (sceneTiming.ts)。時刻を直接持つことで、途中の1つを変えても
   * 触っていないシーンが動かない */
  timeSeconds: number;
  /**
   * 区間のうち、**動くのに使う**秒数。
   * **null なら区間まるごと**を使う（＝全部の時間をかけてじわっと動く）。
   *
   * 短くすると、**余りは移動の前**に置かれる —
   * 【この隊形のまま止まっている → 最後に動く】。そうすると
   * **全員が次のシーンの時刻ちょうどに着く**。踊りは拍で隊形を決めるので、
   * 着地の瞬間が揃っているのが正しい。
   *
   * 「滞在時間」は持たない（滞在 = 区間 − 移動 で出る）。2つ持たせると
   * 足して区間にならない状態を作れてしまう。割り算は `lib/segmentSplit`。
   */
  moveSeconds?: number | null;
};

export type Position = {
  sceneId: string;
  dancerId: string;
  xCoordinate: number;
  yCoordinate: number;
  rotationAngle: number;
  /** 自由曲線パスの制御点(二次ベジェ)。ステージ座標系(0..stageWidthUnits/
   * 0..stageHeightUnits)。null/undefinedなら前シーンの位置からの直線 */
  curveControlX?: number | null;
  curveControlY?: number | null;
};
