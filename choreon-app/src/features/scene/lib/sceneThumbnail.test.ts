import { buildThumbnailDots } from './sceneThumbnail';
import { makeDancer, makePosition } from '@/test/factories';

/** テスト用の色の読み替え。実際の画面ではテーマの表から引く関数が入る */
const passThrough = (color: string) => color;

const DANCERS = {
  'dancer-1': makeDancer({ color: '#3b82f6' }),
  'dancer-2': makeDancer({ id: 'dancer-2', color: '#ef4444' }),
};

describe('buildThumbnailDots', () => {
  it('ステージ座標を0〜1の割合に直す', () => {
    const dots = buildThumbnailDots(
      { 'dancer-1': makePosition({ xCoordinate: 3, yCoordinate: 5 }) },
      DANCERS,
      15,
      10,
      passThrough,
    );

    expect(dots).toEqual([{ x: 0.2, y: 0.5, color: '#3b82f6' }]);
  });

  it('受け取った関数で色を読み替える（テーマごとの値を入れるため）', () => {
    const dots = buildThumbnailDots(
      { 'dancer-1': makePosition() },
      DANCERS,
      15,
      10,
      () => 'rgb(1, 2, 3)',
    );

    expect(dots[0].color).toBe('rgb(1, 2, 3)');
  });

  // ダンサーを消しても、そのダンサーの配置が残っている瞬間がありうる
  it('いないダンサーの配置は描かない', () => {
    const dots = buildThumbnailDots(
      { 'dancer-9': makePosition({ dancerId: 'dancer-9' }) },
      DANCERS,
      15,
      10,
      passThrough,
    );

    expect(dots).toEqual([]);
  });

  it('客席を上にすると、上下を鏡にして描く（ステージと同じ向き）', () => {
    const dots = buildThumbnailDots(
      { 'dancer-1': makePosition({ yCoordinate: 2 }) },
      DANCERS,
      10,
      10,
      passThrough,
      true,
    );

    expect(dots[0].y).toBe(0.8);
  });
});
