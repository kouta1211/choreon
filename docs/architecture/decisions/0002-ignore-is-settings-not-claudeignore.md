# 0002. AI に読ませない指定は `.claude/settings.json` に置く

- 日付: 2026-08-18
- 状態: 採用

## 何に困っていたか

AI のコンテキストから、秘密情報・ビルド成果物・巨大な生成物を外したかった。
一般には `.claudeignore` を置く、という話になっている。

## どうすることにしたか

**`.claudeignore` は効かない。** 入っている CLI 本体（単一の実行ファイル）を
調べたところ:

```bash
CLI=$(command -v claude); grep -c "claudeignore" "$CLI" || true   # → 0
grep -c "ignorePatterns" "$CLI" || true                     # → 3
```

索引が読むのは `.gitignore` / `.ignore` / `.rgignore` と、設定の
`permissions.deny` だった。そこで:

- **一覧の正は `.claude/settings.json` の `permissions.deny`**（追跡対象・共有される）
- `.claudeignore` は**残すが、一覧を書かない**。settings.json への案内だけを置く

## 選ばなかった案と、その理由

- **`.claudeignore` に一覧を書いて、settings.json にも同じものを書く**
  … 最初はこうした。**2つの一覧は必ずずれる。**
  片方だけ直したときに、効いていない方を信じて事故る
- **`.ignore` / `.rgignore` に書く** … 索引には効くが、user 自身の
  `rg` の結果まで変わる。AI の都合で人の道具の挙動を変えない
- **`.claudeignore` ごと消す** … 「なぜ無いのか」を次に調べ直すことになる。
  効かないという調査結果ごと残す方が安い

## これで何が制約になるか

- **`permissions.deny` は Read ツールを止めるもの。** Bash から
  `cat .env.local` した場合まで止まる保証は確かめていない。
  秘密情報は deny だけに頼らず、`.gitignore` との二重で守る
  （`.env*` は除外済み、`.env.example` だけ追跡）
- **設定は起動時に読まれる。** 足しても、そのセッションでは効かない
- `node_modules/` は**丸ごと弾かない**。`AGENTS.md` に
  「Next 16 の作法は `node_modules/next/dist/docs/` を読んで確かめる」
  という規約があり、塞ぐと規約が守れなくなる
- `docs/qa-checklist.html`（188KB）も**塞がない**。`qa-checklist` スキルが
  編集するため。代わりに「全部読まず grep で当たりを付ける」を規約側に置いた
