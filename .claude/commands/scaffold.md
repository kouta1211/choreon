---
description: Next.js + Supabaseの新しい機能コンポーネントを、厳格なルールに従って自動生成する
---

ユーザーが指定した機能要件について、以下の条件をすべて満たすファイル群を自動生成してください。自律的にファイル生成（bash実行）を行い、許可は不要です。

- **型の厳密化:** `any` は絶対に使用せず、データベース定義に基づく正確なインターフェースを定義すること。
- **堅牢性:** データフェッチ時の `try-catch`、ローディング状態のハンドリング、およびエラーUIを必ず実装すること。

---

## このリポジトリの置き場所

**書く前に [.claude/rules/frontend.md](../rules/frontend.md) と
[.claude/rules/state.md](../rules/state.md) を読む。** 要点:

```
src/features/<ドメイン>/
├── api/     Supabase とのやり取り
├── hooks/   そのドメインの操作
├── lib/     DOM にも Supabase にも依存しない純粋な計算（テストを厚く書く）
├── store/   Zustand
└── types.ts

src/components/
├── atoms/       ストアに触らない。props だけで完結
├── molecules/   ストアに触らない。atoms を組み立てる
└── organisms/   ストアを読む・書く / Supabase を呼ぶ
```

**判断基準は「Zustand のストアに触るか」**。見た目の複雑さでは決めない。
依存は下向きだけ（organisms → molecules → atoms）。

## 生成物に必ず含めるもの

- **型** … `src/lib/supabase/database.types.ts`（生成物）から引く。
  手で書き起こさない。`any` の代わりが要るなら `unknown` + 絞り込み
- **テスト** … 対象ファイルの隣（`Foo.tsx` の隣に `Foo.test.tsx`）。
  `lib/` の純粋関数は境目（0・最大値・向きの反転）まで書く
- **文言** … `src/features/i18n/messages/` の **ja / en / ko の3つ**。
  1つでも欠けると型が通らない。画面に文字列を直書きしない
- **見た目** … 色・余白・角丸はトークン経由（`text-fg-strong` `px-gutter`
  `rounded-xl`）。生の色や `rounded-[12px]` を書かない
- **エラー** … Supabase のエラーは `src/lib/supabase/errors.ts` の
  `toUserMessage` を通し、`useUIStore` の `showToast` で出す。
  **専用のエラー画面を新しく作らない**（既にある道に合わせる）
- **保存** … 【楽観的に画面を変える → 保存する → 失敗したら戻す →
  成功してから履歴に積む】。立ち位置の編集は
  `features/scene/hooks/usePositionCommit` を通す

## 作る前に

**同じものが既に無いか探す。** `src/components/atoms` と `molecules` に
汎用のものはだいたい揃っている（`PressableButton` `BottomSheet`
`SegmentedControl` `Tooltip` など）。同じ見た目を2つ作ると、
テーマを直すときに片方が取り残される。

**表を新しく作るなら、GRANT と RLS の確認クエリを必ず流す**
（[.claude/rules/backend.md](../rules/backend.md)）。ここを飛ばすと 401 になる。

## 作った後

1. `npm run verify` を通す
2. 画面に見える機能なら `/qa-checklist` を回す
3. 仕様は `docs/features/<ドメイン>.md` に
   （[雛形](../../docs/features/_template.md)。**数字は書かず定数名を書く**）
