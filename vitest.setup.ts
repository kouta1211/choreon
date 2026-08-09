// globals: true を使わない方針のため、Vitestのexpectを拡張する専用サブパスを使う
import "@testing-library/jest-dom/vitest";

import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useHistoryStore } from "@/features/canvas/store/useHistoryStore";
import { useProjectStore } from "@/features/project/store/useProjectStore";

// Zustandのストアはモジュール単位の実体なので、テストをまたいで値が残る。
// 各テストファイルで必要な項目だけを書き戻していたが、その一覧は手で
// 保守するしかなく、ストアに項目が増えるたびに書き漏れて前のテストの状態が
// 次へ漏れる余地があった。初期状態を最初に控えておいて丸ごと戻す。
//
// setStateの第2引数がtrueだと「差分ではなく置き換え」になる。控えた初期状態
// には関数(アクション)も入っているので、置き換えてもストアは壊れない。
// 型の違うストアを1つの配列に入れると setState が呼べない共用体になるため、
// ストアごとに型を保ったまま「戻す関数」に畳んでおく
function makeReset<T>(store: {
  getState: () => T;
  setState: (state: T, replace: true) => void;
}): () => void {
  const initialState = store.getState();
  return () => store.setState(initialState, true);
}

const RESET_STORES = [
  makeReset(useUIStore),
  makeReset(useHistoryStore),
  makeReset(useProjectStore),
];

// globals: true を使わないと@testing-library/reactの自動afterEach cleanupが
// 効かず、あるテストで描画したDOMが次のテストに残ってしまう。
// (例: 同じdata-testidを持つ要素が複数ヒットしてgetByTestId等が失敗する)
// そのため明示的にテストごとのクリーンアップを登録する
afterEach(() => {
  cleanup();
  RESET_STORES.forEach((reset) => reset());
});
