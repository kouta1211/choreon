import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/** 直書きを見つけたときに出す言葉。4つの形で同じことを言う */
const JA_MESSAGE =
  "画面に出す文字列を直書きしない。src/features/i18n/messages/ の ja / en / ko へそろえて足し、useT() から読む(直書きは型検査をすり抜け、日本語以外で開いた人にだけ日本語が出る)";

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
  // 画面に出す文字列の直書きを、機械で捕まえる。
  //
  // 文言は ja / en / ko の3つそろえる決まりで、型はそこを見張っている。
  // だが **JSX に直に書いた日本語は、その型検査をすり抜ける** —
  // 英語や韓国語で開いた人にだけ日本語が出る、という壊れ方をする。
  // 画面を見ても、日本語で見ている限り気づけない。
  //
  // 2026-08-20 に共有シート、2026-08-21 に動画の書き出しで見つけたので、
  // 3度目を待たずに仕掛けへ上げた。直し方は
  // src/features/i18n/messages/ へ3言語そろえて足し、useT() から読む。
  {
    files: ["src/**/*.tsx"],
    ignores: ["src/**/*.test.tsx", "src/features/i18n/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXText[value=/[\u3040-\u30ff\u4e00-\u9fff]/]",
          message: JA_MESSAGE,
        },
        {
          selector:
            "JSXExpressionContainer Literal[value=/[\u3040-\u30ff\u4e00-\u9fff]/]",
          message: JA_MESSAGE,
        },
        {
          selector:
            "JSXExpressionContainer TemplateElement[value.raw=/[\u3040-\u30ff\u4e00-\u9fff]/]",
          message: JA_MESSAGE,
        },
        {
          selector:
            "JSXAttribute[name.name=/^(aria-label|title|placeholder|alt)$/] Literal[value=/[\u3040-\u30ff\u4e00-\u9fff]/]",
          message: JA_MESSAGE,
        },
      ],
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
