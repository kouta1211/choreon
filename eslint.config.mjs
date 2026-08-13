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
    // デザインツールの書き出し(参照用で、ここでビルドするコードではない)。
    // .gitignore にも入れているが、ESLint はそちらを見ないので別途要る
    "design_handoff_*/**",
    "*.dc.html",
    "support.js",
    "uploads/**",
  ]),
]);

export default eslintConfig;
