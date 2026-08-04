# Choreon

スマートフォンに最適化されたダンスフォーメーション作成アプリ(MVP開発中)。

## 技術スタック

- Next.js (App Router) / React / TypeScript
- Tailwind CSS
- Zustand(状態管理: ドメイン状態とUI状態を分離)
- Supabase(Auth, PostgreSQL)
- dnd-kit(ドラッグ&ドロップ) / motion(シーン切り替え時のアニメーション)

## セットアップ

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) を開いて確認する。

Supabase側のテーブルは [supabase/schema.sql](supabase/schema.sql) を
SQL Editorで実行して作成する(RLSポリシー込み)。適用後はファイル末尾の
確認クエリで、GRANT状況とRLSポリシーが意図通りであることを必ず確認すること。

## ディレクトリ構成

```
src/
├── app/            # ルーティング(App Router)
├── features/       # ドメインごとの機能単位(project/dancer/scene/canvas/auth)
├── lib/supabase/   # Supabaseクライアント
└── components/ui/  # 汎用UIパーツ
```

## npm scripts

- `npm run dev` — 開発サーバー起動
- `npm run lint` — ESLint実行
- `npm run build` — 本番ビルド
