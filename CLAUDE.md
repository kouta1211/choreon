@AGENTS.md

# Choreon — AI 用の入口

振付を作って共有する Web アプリ。**作るのは PC のブラウザ、見るのはスマホ**
という分業で作っている（README「フェーズ6」）。

作業を始める前に、下の「読むもの」から**いま触る所の分だけ**開く。
全部読むと、肝心のコードを読む余裕が無くなる。

## 読むもの

### 規約（コードの書き方）

| 触るもの | ファイル |
| --- | --- |
| 索引・**最初に踏む地雷** | [.claude/rules/README.md](.claude/rules/README.md) |
| 画面・コンポーネント・文言・見た目 | [.claude/rules/frontend.md](.claude/rules/frontend.md) |
| Supabase・スキーマ・Route Handler | [.claude/rules/backend.md](.claude/rules/backend.md) |
| Zustand のストア・履歴・保存 | [.claude/rules/state.md](.claude/rules/state.md) |
| テスト・`npm run verify`・動作確認 | [.claude/rules/testing.md](.claude/rules/testing.md) |

### 資料（何がどうなっているか）

| 知りたいこと | ファイル |
| --- | --- |
| 全体の構造・データの流れ | [docs/architecture/overview.md](docs/architecture/overview.md) |
| テーブルと権限 | [docs/data-model.md](docs/data-model.md) |
| 機能の地図（15ドメイン） | [docs/features/README.md](docs/features/README.md) |
| 過去にハマったこと | [docs/lessons_learned.md](docs/lessons_learned.md) |
| なぜその作りにしたか | README「開発の記録」/ [docs/architecture/decisions/](docs/architecture/decisions/) |
| docs 全体の歩き方 | [docs/README.md](docs/README.md) |

### コードの隣にある説明（**これが正**。写して使わない）

- コンポーネントをどの層に置くか → `src/components/README.md`
- 列の意味と制約の理由 → `supabase/schema.sql` のコメント
- Next.js 16 の作法（訓練データと違う） → `AGENTS.md` と `node_modules/next/dist/docs/`

## 振る舞いのルール

### 1. 直したものは差分で見せる

ファイル全体を貼り直さない。**変えた所だけ**を、変更前 → 変更後の形で示し、
「何をどう変えたか」「なぜその変更が要るか」を続ける
（user は React を学習中で、理由込みでないと読めない）。

一度に大きく作らない。小さく区切って、**方針を確かめてから**手を動かす。

### 2. 学んだことを自分で記録する

**同じ穴に2回落ちないためのファイルが `docs/lessons_learned.md`。**
以下に当たったら、その場で追記してよい（許可を待たない）。

- 原因が想像とずれていた不具合を直した
- ライブラリやフレームワークが想定と違う挙動をした
- user から作り方・書き方について指摘を受けた

書くのは「起きたこと」ではなく**「次はどうするか」**。
同じ教訓が2回出たら、箇条書きを増やさず `.claude/rules/` の該当ファイルへ
昇格させる。セッションの終わりにまとめて振り返るときは `/wrap-up`。

### 3. 検索したら、どちらのアプリか確かめる

`src/`（Next.js・本体）と `choreon-app/`（Expo・フェーズ4で停止）に
**同名のファイルが多数ある**。何も言われていなければ直すのは `src/` の方。
`choreon-app/` は ESLint の対象外なので、壊しても `npm run verify` は黙る。

### 4. 大きいファイルを丸ごと開かない

`docs/qa-checklist.html`（188KB）と `package-lock.json` が主な罠。
`grep -n` で当たりを付けて、その周りだけ `sed -n` で開く。

# 実装したら動作確認チェックリストを更新する

このプロジェクトは user が**実機で自分の目で**動作確認する。その台本が
`docs/qa-checklist.html`（公開先の Artifact を user がブックマークしている）。

**画面に見える変更をしたら、コミットの前に `qa-checklist` スキルを必ず実行すること。**
手順は `.claude/skills/qa-checklist/SKILL.md` にある。対象になるのは:

- 機能を足した / 挙動を変えた（しきい値・既定値・順番・文言）
- 機能を消した（**古い項目を消す。これを忘れると「動かない」と報告が来る**）
- バグを直した（再発を捕まえる項目を足す）

内部の整理・型・テストだけの変更なら更新しない。

チェックリストを更新せずにコミットしてよいのは、**user が明示的にそう言ったとき**だけ。

# 開発サーバー

`npm run dev` は user が既に立てていることが多い。ポート3000が塞がっていたら
新しく立てず、そのサーバーを使うこと。
