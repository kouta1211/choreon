// globals: true を使わない方針のため、Vitestのexpectを拡張する専用サブパスを使う
import "@testing-library/jest-dom/vitest";

import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// globals: true を使わないと@testing-library/reactの自動afterEach cleanupが
// 効かず、あるテストで描画したDOMが次のテストに残ってしまう。
// (例: 同じdata-testidを持つ要素が複数ヒットしてgetByTestId等が失敗する)
// そのため明示的にテストごとのクリーンアップを登録する
afterEach(() => {
  cleanup();
});
