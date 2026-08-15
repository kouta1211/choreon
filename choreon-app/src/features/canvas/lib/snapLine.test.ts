import { NO_SNAP_LINE, snapLineFor } from './snapLine';

/** 14×10 のステージを 700×500px で描いている＝1ユニット 50px */
const BASE = {
  stageSize: { width: 700, height: 500 },
  stageWidthUnits: 14,
  stageHeightUnits: 10,
  isAudienceOnTop: false,
  isSnapEnabled: true,
  tolerance: 0.1,
};

describe('snapLineFor', () => {
  it('格子線のすぐ近くまで来たら、その線を返す', () => {
    // 3.0 から 2ユニット右（100px）＝ ちょうど 5.0
    expect(snapLineFor({ ...BASE, x: 3, y: 4, totalDx: 100, totalDy: 0 })).toEqual({
      x: 5,
      y: 4,
    });
  });

  it('線から離れていれば返さない（吸わないので光らせない）', () => {
    // 3.0 から 1.5ユニット右（75px）＝ 4.5。どちらの線からも遠い
    expect(snapLineFor({ ...BASE, x: 3, y: 4.5, totalDx: 75, totalDy: 0 })).toEqual(
      NO_SNAP_LINE,
    );
  });

  it('縦横どちらも近ければ2本とも返す（交差点へ吸う）', () => {
    const line = snapLineFor({ ...BASE, x: 3, y: 4, totalDx: 100, totalDy: 50 });
    expect(line).toEqual({ x: 5, y: 5 });
  });

  it('吸着を切っていれば、近くても返さない', () => {
    expect(
      snapLineFor({ ...BASE, isSnapEnabled: false, x: 3, y: 4, totalDx: 100, totalDy: 0 }),
    ).toEqual(NO_SNAP_LINE);
  });

  it('客席を上にしているときは、画面の向きで数える', () => {
    // ステージの y=4 は、高さ10・上下逆なら画面では 6。
    // そこから 50px（1ユニット）下へ動かすと画面の 7
    expect(
      snapLineFor({ ...BASE, isAudienceOnTop: true, x: 3, y: 4, totalDx: 0, totalDy: 50 }),
    ).toEqual({ x: 3, y: 7 });
  });

  it('ステージの外へは出さない（端で止まる）', () => {
    expect(snapLineFor({ ...BASE, x: 13, y: 4, totalDx: 500, totalDy: 0 })).toEqual({
      x: 14,
      y: 4,
    });
  });

  it('まだ実寸を測れていなければ返さない（0 で割らない）', () => {
    expect(
      snapLineFor({ ...BASE, stageSize: { width: 0, height: 0 }, x: 3, y: 4, totalDx: 100, totalDy: 0 }),
    ).toEqual(NO_SNAP_LINE);
  });
});
