import { resolveNumberInput } from './numberField';

describe('resolveNumberInput', () => {
  it('範囲の中の数はそのまま通す', () => {
    expect(resolveNumberInput('14', 6, 30)).toBe(14);
  });

  it('小数も通す（シーンの間隔は0.5刻み）', () => {
    expect(resolveNumberInput('2.5', 0.5, 16)).toBe(2.5);
  });

  it('前後の空白は無視する', () => {
    expect(resolveNumberInput('  12  ', 6, 30)).toBe(12);
  });

  it('下限より小さければ下限に丸める', () => {
    expect(resolveNumberInput('1', 6, 30)).toBe(6);
  });

  it('上限より大きければ上限に丸める', () => {
    expect(resolveNumberInput('999', 6, 30)).toBe(30);
  });

  it('空欄は null（前の値に戻す）', () => {
    expect(resolveNumberInput('', 6, 30)).toBeNull();
    expect(resolveNumberInput('   ', 6, 30)).toBeNull();
  });

  it('数として読めないものは null', () => {
    expect(resolveNumberInput('abc', 6, 30)).toBeNull();
    expect(resolveNumberInput('1.2.3', 6, 30)).toBeNull();
  });
});
