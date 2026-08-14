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

### Supabaseのスキーマ

[supabase/schema.sql](supabase/schema.sql) をSQL Editorで実行する
(RLSポリシー込み)。適用後はファイル末尾の確認クエリで、GRANT状況とRLSポリシーが
意図通りであることを必ず確認すること。

このファイルが**いまのスキーマの正**で、これ1本で作り直せる。以前は
`supabase/migrations/` に「既存のDBへ後から列を足す」ためのSQLを番号順に
置いていたが、すべて適用済みになったため削除した。列を足したときは
schema.sql を書き換える。

> スキーマが古いままだと、遷移時間の変更や導線の曲線編集、曲の頭出しの保存が
> PostgRESTのエラー(`PGRST204`)で失敗する。その場合アプリは
> 「DBのスキーマが古いようです。〜」というトーストを表示する。

### 環境変数

`.env.example` をコピーして `.env.local` を作成し、Supabaseプロジェクトの
Settings > API から値を入れる(`.env.local` はgit管理対象外)。

```bash
cp .env.example .env.local
```

### Supabaseの型生成

`src/lib/supabase/database.types.ts` は現状 `supabase/schema.sql` を手で
写した暫定版。Supabaseプロジェクトを作成したら、以下でCLIから正式に生成し
上書きする(生成後、暫定版と差分がないか確認すること)。

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase gen types typescript --project-id <project-ref> > src/lib/supabase/database.types.ts
```

## ディレクトリ構成

```
src/
├── app/            # ルーティング(App Router)
├── features/       # ドメインごとの機能単位(project/dancer/scene/canvas/auth)
├── lib/supabase/   # Supabaseクライアント(client.ts/server.ts/database.types.ts)
└── components/ui/  # 汎用UIパーツ
```

## npm scripts

- `npm run dev` — 開発サーバー起動
- `npm run lint` — ESLint実行
- `npm run test` / `npm run test:run` — Vitest(watch / 単発実行)
- `npm run build` — 本番ビルド
- `npm run verify` — lint → test → build をまとめて実行
