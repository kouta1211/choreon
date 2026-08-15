import type { ReactElement, ReactNode } from 'react';
import { render as rtlRender } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

/**
 * 画面の部品を描くためのテスト用の入口。
 *
 * ■ なぜ包む必要があるのか
 * 端末の「安全な余白」（ノッチやホームバーを避ける幅）は、実機では OS が
 * 教えてくれる。テストには OS がいないので、**`useSafeAreaInsets` が
 * 提供者を見つけられずに落ちる**。ここで決め打ちの値を渡しておく。
 *
 * 数値は iPhone のよくある値。**余白そのものを確かめるテストは書かない**
 * （端末ごとに違う値で、決め打ちを検算しても意味がない）ので、
 * 落ちなければ足りる。
 */
const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function Providers({ children }: { children: ReactNode }) {
  return <SafeAreaProvider initialMetrics={METRICS}>{children}</SafeAreaProvider>;
}

/**
 * **`render` は Promise を返す**（@testing-library/react-native v14 から）。
 * 待たずに使うと、戻り値にクエリが無い（`getByText is not a function`）し、
 * `screen` も「render がまだ呼ばれていない」と言う。**必ず await する。**
 *
 * **`fireEvent` も同じく Promise を返す。** await せずに次の行で値を見ると、
 * まだ何も起きていない（実際に、controlled な TextInput の value が
 * 空のままだった）。押す・打つは必ず await する。
 *
 * `export *` での再エクスポートはしない — 向こうにも `render` があり、
 * こちらの包んだ方を上書きしてしまう。`fireEvent` などはテスト側で直に読む。
 */
export async function renderWithProviders(ui: ReactElement) {
  return await rtlRender(ui, { wrapper: Providers });
}
