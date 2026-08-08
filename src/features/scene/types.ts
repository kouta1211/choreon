export type Scene = {
  id: string;
  projectId: string;
  name: string;
  orderIndex: number;
  /** このシーンへ遷移してくるまでの所要時間(秒)。先頭のシーンの値は使われない */
  transitionDurationSeconds: number;
};

export type Position = {
  sceneId: string;
  dancerId: string;
  xCoordinate: number;
  yCoordinate: number;
  rotationAngle: number;
  /** このダンサーだけ、シーンのtransitionDurationSecondsを上書きして
   * 個別の遷移時間(秒)を使いたい場合に設定する。null/undefinedならシーンの
   * 既定値を使う(全員が同じ速さで動く、これまで通りの挙動) */
  dancerTransitionDurationSeconds?: number | null;
  /** 自由曲線パスの制御点(二次ベジェ)。ステージ座標系(0..stageWidthUnits/
   * 0..stageHeightUnits)。null/undefinedなら前シーンの位置からの直線 */
  curveControlX?: number | null;
  curveControlY?: number | null;
};
