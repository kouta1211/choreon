export type Scene = {
  id: string;
  projectId: string;
  name: string;
  orderIndex: number;
  /**
   * **この隊形が頭から何拍目か。ここが正**(2026-08-25)。
   * 8拍 = 1セット(稽古場で数える単位)。
   *
   * 振付はカウントで組み、最後に曲へ載せる。**載せ方を変えても
   * 振付の中身は1つも変わらない**のが正しいので、秒ではなく拍を持つ。
   * 1カウント目より手前に置かれた隊形は**負の拍**になる（それが正しい）。
   */
  positionBeats: number;
  /**
   * この隊形が曲の何秒目にあたるか。
   *
   * ⚠️ **派生値。書き込まない。** 作るのは `withDerivedTimes`
   * (`features/music/lib/placement.ts`) だけで、正は `positionBeats`。
   * ここを直に書き換えると、保存される拍と画面の秒が食い違い、
   * **画面は普通に動いて見えるのに数字だけ静かにずれる**。
   *
   * 秒のまま残しているのは、これを読む所が34ファイルあるため。
   * 区間の長さは「次のシーンの時刻 − このシーンの時刻」で毎回求める
   * (sceneTiming.ts)。
   */
  timeSeconds: number;
  /**
   * 区間のうち、**動くのに使う拍数。ここが正**。
   * null なら区間まるごと。秒ではなく拍なのは `positionBeats` と同じ理由。
   */
  moveBeats?: number | null;
  /**
   * 区間のうち、**動くのに使う**秒数。⚠️ **派生値**（`moveBeats` が正）。
   *
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
