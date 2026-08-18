# サーバー側の規約（Supabase / Route Handler）

## 1. Supabase クライアントは3つ。用途を間違えない

`src/lib/supabase/`

| ファイル | どこから呼ぶか |
| --- | --- |
| `client.ts` | ブラウザ（"use client" のコンポーネント・`features/*/api/`） |
| `server.ts` | Server Component / Route Handler |
| `middleware.ts` | `src/proxy.ts` から。セッションの更新だけ |
| `errors.ts` | PostgREST のエラーを user 向けの文言に翻訳する。**エラー処理はここを通す** |

`@supabase/ssr` 版で、ネイティブ版（`choreon-app/`）の素の `supabase-js` とは
**別物**。片方のコードをもう片方へ写さない。

## 2. スキーマは `supabase/schema.sql` 1本が正

`supabase/migrations/` は無い（全部適用済みになったので削除した）。
列を足すときは schema.sql を書き換える。DB はこれ1本で作り直せる状態を保つ。

テーブルは4つ: `projects` / `dancers` / `scenes` / `positions`。
詳しくは [../../docs/data-model.md](../../docs/data-model.md)。

> スキーマが古いと PostgREST が `PGRST204` を返し、アプリは
> 「DBのスキーマが古いようです。」というトーストを出す。
> 「保存できない」という報告が来たら、まずこれを疑う。

## 3. テーブルを作ったら、GRANT と RLS を必ず確認する

手順は user のグローバル `CLAUDE.md` にある。**確認クエリを実際に流すまで完了にしない。**
要点だけ:

- Supabase は新しいテーブルへ `anon` にも自動で全権限を付ける既定を持っている。
  **明示的に GRANT していなくても付いている**
- このアプリのテーブルは全部**個人データ**。`anon` からは剥奪する
  （`revoke all on public.<表> from anon;`）
- RLS は `auth.uid() = user_id`。子テーブル（dancers / scenes / positions）は
  親の `projects` を辿って所有者を確かめる

例外は**共有リンクで見る経路**だけ。`shared_project(uuid)` という関数を
`anon` に `execute` だけ許して、テーブルへの直接の権限は与えていない。

## 4. API キーをクライアントへ出さない

Gemini（隊形の講評）は必ず Route Handler（`src/app/api/`）を挟む。
`NEXT_PUBLIC_` を付けた環境変数はブラウザに焼き込まれる。鍵を入れない。

## 5. 型は生成物。手で直さない

`src/lib/supabase/database.types.ts` は `supabase gen types` の出力
（現状は schema.sql を手で写した暫定版）。手で書き足すのではなく、
schema.sql を直してから生成し直す。手順は README「Supabaseの型生成」。
