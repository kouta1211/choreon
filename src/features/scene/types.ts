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
  /** このダンサーだけ、区間の長さより短く動きたい場合に設定する(秒)。
   * null/undefinedなら区間いっぱいを使う(全員が同じ速さで動く)。
   * シーンが時刻を持つようになったので、区間の長さは
   * 「次の時刻 − この時刻」で決まる。ここに区間より短い値を入れると
   * 「早く着いて、残りは立って待つ」という意味になる */
  dancerTransitionDurationSeconds?: number | null;
  /** 自由曲線パスの制御点(二次ベジェ)。ステージ座標系(0..stageWidthUnits/
   * 0..stageHeightUnits)。null/undefinedなら前シーンの位置からの直線 */
  curveControlX?: number | null;
  curveControlY?: number | null;
};
