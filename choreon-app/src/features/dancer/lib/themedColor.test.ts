import { themedDancerColor } from './themedColor';
import { DANCER_COLOR_PALETTE } from '@/features/dancer/constants';
import { THEME_VARS } from '@/features/theme/themeVars.generated';
import { THEME_IDS } from '@/features/theme/catalog';

/**
 * Web版の同名テストと**同じ4つ**を見ているが、期待値が違う。Web版は
 * `var(--dancer-1)` という名前を返し、こちらは表から引いた**実際の色**を返す
 * （React Native は style の CSS 変数を解決しないため）。
 */
describe('themedDancerColor', () => {
  it('パレットの色は、同じ並び順のテーマ色に読み替える', () => {
    expect(themedDancerColor(DANCER_COLOR_PALETTE[0], 'paper')).toBe(
      THEME_VARS.paper['--dancer-1'],
    );
    expect(themedDancerColor(DANCER_COLOR_PALETTE[5], 'paper')).toBe(
      THEME_VARS.paper['--dancer-6'],
    );
  });

  it('既定のテーマでは、保存されている色がそのまま出る', () => {
    // ミッドナイトの --dancer-N はパレットと同じ6色。ここがずれていたら、
    // テーマを触っていない人の画面で色が変わってしまう
    for (const color of DANCER_COLOR_PALETTE) {
      expect(themedDancerColor(color, 'midnight')).toBe(color);
    }
  });

  it('どのテーマでも、6色が重複なく1..6に対応する', () => {
    for (const theme of THEME_IDS) {
      const mapped = DANCER_COLOR_PALETTE.map((color) =>
        themedDancerColor(color, theme),
      );
      expect(new Set(mapped).size).toBe(DANCER_COLOR_PALETTE.length);
    }
  });

  it('パレットに無い色はそのまま返す（テーマ側に対応する色が無いため）', () => {
    expect(themedDancerColor('#123456', 'neon')).toBe('#123456');
  });

  it('読み替えても保存されている値は変わらない（引数を書き換えない）', () => {
    const original = [...DANCER_COLOR_PALETTE];
    DANCER_COLOR_PALETTE.forEach((color) => themedDancerColor(color, 'chalk'));
    expect(DANCER_COLOR_PALETTE).toEqual(original);
  });
});
