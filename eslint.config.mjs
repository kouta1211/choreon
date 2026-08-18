import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // 保存し忘れ(await の付け忘れ)を機械で捕まえる。
  //
  // このアプリの編集はどれも【楽観的に画面を変える → 保存する →
  // 失敗したら戻す】で、保存は非同期。await を落とすと画面だけ変わって
  // 保存されず、しかもエラーが誰にも届かない。**目に見えない壊れ方**なので
  // 人のレビューでは落ちる。型情報が要るルールなので parserOptions を足す
  // (src だけに掛けて 15 秒ほど)。
  //
  // 意図して投げっぱなしにするものは `void` を付ける
  // (自分でエラーを処理しているもの・アニメーションの完了待ちなど)。
  //
  // テストは対象外。テストで浮いた Promise は「テストが不安定になる」という
  // 目に見える失敗で、本番の黙って消える保存とは危険度が違う
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    ignores: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/await-thenable": "error",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // デザインツールの書き出し(参照用で、ここでビルドするコードではない)。
    // .gitignore にも入れているが、ESLint はそちらを見ないので別途要る
    // ネイティブ版(Expo)。別プロジェクトで、ルールも tsconfig も別に持つ
    "choreon-app/**",
    "design_handoff_*/**",
    "*.dc.html",
    "support.js",
    "uploads/**",
  ]),
]);

export default eslintConfig;
