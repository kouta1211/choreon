import {
  DARK_SCHEME_THEME,
  isLightTheme,
  LIGHT_SCHEME_THEME,
  schemeForTheme,
  themeForScheme,
} from './colorScheme';

/**
 * 設定の「見た目の明るさ」と、テーマ10種の橋渡し。
 *
 * ここで守りたいのは **「同じ明るさならテーマを変えない」** の1点。
 * これを落とすと、設定画面を開いて明るさを選び直すたびに、パレットで
 * 選んだテーマ（ネオンなど）が既定へ戻る。画面には出るが「戻ってしまう」
 * だけなので、壊れても不具合として気づきにくい。
 */
describe('isLightTheme', () => {
  it('素材系は明るい側', () => {
    expect(isLightTheme('paper')).toBe(true);
  });

  it('暗い系は暗い側', () => {
    expect(isLightTheme('midnight')).toBe(false);
    expect(isLightTheme('neon')).toBe(false);
  });
});

describe('schemeForTheme', () => {
  it('いまのテーマから、設問の答えを導く', () => {
    expect(schemeForTheme('paper')).toBe('light');
    expect(schemeForTheme('neon')).toBe('dark');
  });
});

describe('themeForScheme', () => {
  it('同じ明るさなら、いまのテーマを残す', () => {
    // ネオンのまま「暗い」を選び直しても、ミッドナイトへは戻さない
    expect(themeForScheme('neon', 'dark', false)).toBe('neon');
  });

  it('明るさが変わるときだけ、その側の既定へ移す', () => {
    expect(themeForScheme('neon', 'light', false)).toBe(LIGHT_SCHEME_THEME);
    expect(themeForScheme('paper', 'dark', false)).toBe(DARK_SCHEME_THEME);
  });

  it('端末に合わせるときは、端末の明るさで決まる', () => {
    expect(themeForScheme('neon', 'system', true)).toBe(LIGHT_SCHEME_THEME);
    expect(themeForScheme('paper', 'system', false)).toBe(DARK_SCHEME_THEME);
  });

  it('端末に合わせていて、いまのテーマが既にその明るさなら残す', () => {
    expect(themeForScheme('neon', 'system', false)).toBe('neon');
  });
});
