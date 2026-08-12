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

**新規にDBを作る場合**は [supabase/schema.sql](supabase/schema.sql) を
SQL Editorで実行する(RLSポリシー込み)。適用後はファイル末尾の確認クエリで、
GRANT状況とRLSポリシーが意図通りであることを必ず確認すること。

**既にテーブルがあるプロジェクトに後から列を足す場合**は、schema.sqlではなく
[supabase/migrations/](supabase/migrations) 配下のSQLを番号順にSQL Editorで
実行する。

```
supabase/migrations/0000_bounds_and_stage_defaults.sql
supabase/migrations/0001_transition_and_curve.sql
supabase/migrations/0002_stage_width_14.sql
supabase/migrations/0003_music_offset.sql
```

どのファイルも「何度実行しても安全」に書いてあるため、適用済みか分からない
場合はとりあえず流してよい。各ファイル末尾に、意図した列が揃ったかを確認する
クエリが付いている。

> マイグレーションが未適用のままだと、遷移時間の変更や導線の曲線編集、
> 曲の頭出しの保存がPostgRESTのエラー(`PGRST204`)で失敗する。その場合アプリは
> 「DBのマイグレーションが未適用です。〜」というトーストを表示する。
> なお0003については、頭出しを既定(0秒)のままにしているかぎり読み書きとも
> 未適用のDBで通るようにしてあるので、曲を使わない作品は影響を受けない。

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
