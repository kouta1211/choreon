import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Claude Designから書き出したハンドオフ一式。参照用のプロトタイプで
    // ここでビルドするコードではないため、lintの対象から外す
    // (.gitignoreにも入れているが、ESLintはそちらを見ないので別途必要)。
    // 書き出しはフォルダの外にも道連れを落とすので、そちらも並べる
    "design_handoff_*/**",
    "*.dc.html",
    "support.js",
    "uploads/**",
  ]),
]);

export default eslintConfig;
