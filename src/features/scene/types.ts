export type Scene = {
  id: string;
  projectId: string;
  name: string;
  orderIndex: number;
  /** この隊形が曲の何秒目にあたるか。
   * 移動にかかる時間は「次のシーンの時刻 − このシーンの時刻」で毎回求める
   * (sceneTiming.ts)。時刻を直接持つことで、途中の1つを変えても
   * 触っていないシーンが動かない */
  timeSeconds: number;
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
