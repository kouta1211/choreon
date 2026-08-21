# データモデル

**列の意味と制約の理由は `supabase/schema.sql` のコメントが正。**
ここに書くのは、そのファイルを1本読んでも分からないこと（表どうしの関係、
DB では守れずアプリ側で守っている決まり、権限の方針）だけ。

## 表は4つ

```
auth.users
   └─ projects            作品。1人が何本でも持つ
        ├─ dancers        その作品に出る人
        ├─ scenes         隊形。「曲の何秒目か」が並び順の正
        └─ positions      (scene_id, dancer_id) の複合PK。誰がどこに立つか
```

`on delete cascade` で全部つながっている。作品を消せば下も消える。

## 時間の持ち方（一度作り直した所）

`scenes.time_seconds` = **この隊形は曲の何秒目か**。これが正で、並び順もこの昇順。
移動にかかる時間は「次のシーンの時刻 − このシーンの時刻」として**毎回求める**
（`features/scene/lib/sceneTiming.ts`）。

以前は逆に「前のシーンからここへ来るのに何秒か」を持っていた。その持ち方だと
途中の1つを変えるだけで以降が全部後ろへずれ、**サビに合わせて置いた隊形が
サビから外れた**。この形へ戻さないこと。

## DB では守れず、アプリ側で守っている決まり

- **立ち位置がステージからはみ出さないこと。** ステージの広さは作品ごとに
  可変なので、`check` で上限を書けない（他テーブルの値を参照できない）。
  DB は「0以上」と NaN 混入だけを止める最終防衛線
  → アプリ側は `features/canvas/lib/stageSize.ts` と
    `features/project/lib/stageResize.ts`（**狭めたときは端へ寄せる**）
- **シーンの時刻を 0.1 秒以上空けること。** `order_index` は時刻が同じときの
  保険としてだけ残してある
- 角度の範囲チェックは `::float8` にキャストしてから。numeric のままだと
  `NaN >= 0` が true になって NaN を通してしまう

## 権限（個人データ方針）

4表すべて RLS 有効・`anon` から全権限を剥奪済み。ポリシーは
`auth.uid() = user_id`、子表は親の `projects` を辿る。

**例外は共有リンクだけ。** `projects.share_token`（uuid）と `is_shared`（bool）を
持ち、閲覧は関数 `public.shared_project(uuid)` 経由。この関数だけ `anon` に
`execute` を許し、**表そのものへの権限は与えていない**。
`is_shared` が false の間はどのリンクでも開けない。

**関数が返さないものが3つある。** 合鍵（`share_token`）・持ち主（`user_id`）・
**曲の名前**（`music_title`）。曲の名前を外したのは 2026-08-21 —
画面には出していなかったが、リンクを開いた人へファイル名が渡っていた。
ファイル名には個人名や公演名が入る。見る側が要るのは「曲に合わせて
組まれた作品か」だけなので、`has_music` という真偽値に畳んで渡す。

**新しい表を足したら、GRANT と RLS の確認クエリを必ず流す。**
手順は user のグローバル `CLAUDE.md`。Supabase は新しい表へ `anon` にも
自動で全権限を付ける既定を持っている。

## 変え方

`supabase/schema.sql` を書き換える（`migrations/` は無い。全部適用済みなので
削除した）。そのあと README「Supabaseの型生成」の手順で
`src/lib/supabase/database.types.ts` を生成し直す。

スキーマが古いままだと PostgREST が `PGRST204` を返し、アプリは
「DBのスキーマが古いようです。」というトーストを出す。
