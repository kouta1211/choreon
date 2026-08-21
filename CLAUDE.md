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

## 作業の流れ（コマンド）

一続きで使う。**手段が目的にならないように、要らない段は飛ばす。**

```
続きから  → /resume      前回の続きを再開する（セッションの頭）
アイデア  → /spec        仕様書を docs/features/ に起こす
作る      → /scaffold    規約どおりの雛形を生やす
直す      → /auto-fix    原因を特定して直し、verify が通るまで自己修正
調べる    → /analyze     書き換える前に依存と影響範囲を洗う（/refactor の前段）
先に縛る  → /test-gen    実装の前に、振る舞いを決めるテストを書く
通す      → /test-pass   落ちているテストが通るまで実装する（TDD の後半）
整える    → /refactor    テストで縛ってから、単一責任へ割る
確かめる  → /qa-checklist  画面に見える変更を、実機の台本へ反映（コミット前）
分ける    → /branch      分ける理由があるときだけ。既定は main へ直接
残す      → /commit      差分を読んでコミット（push はしない）
出す      → /pr          push して PR を作る（main に居たら止まる）
締める    → /wrap-up     学びを docs/lessons_learned.md へ（その日の終わり）
畳む      → /reset       話が長くなったので途中で切る前の安全確認

一気に  → /auto-dev    上を1〜8まで通しで回す。**輪郭がはっきりした小さい追加だけ**
```

保守点検は3日に1回、`/daily-maintenance` が自動で回る。

**`/init-ai-env` は個人用スキル**（`~/.claude/skills/`）へ移した。
どのプロジェクトからでも呼べる — 新しいリポジトリで一度回すと、
そこを分析して同じ形の環境を作る。ここに置いておくと Choreon でしか
使えないうえ、2箇所に同じものができてずれる。

## 振る舞いのルール

**説明の量・自律の範囲・品質の原則・学びの記録は、グローバルの
`~/.claude/CLAUDE.md`（個人ルール）が正。** ここには写さない
（2箇所に置くと必ずずれる）。以下はこのリポジトリ固有の分だけ。

### 1. いま機械で守られていること

**下がっていたら直す。** 詳しくは
[.claude/rules/testing.md](.claude/rules/testing.md)。

| 何 | どう担保しているか |
| --- | --- |
| `any` 禁止 | ESLint `no-explicit-any` が error。`src/` の使用箇所は 0 |
| 型の厳格さ | `tsconfig.json` の `strict: true` |
| **保存し忘れ**（`await` の付け忘れ） | ESLint `no-floating-promises` が error（`src/` の本番コードのみ）。意図して投げっぱなしにするものは `void` を付ける |
| **文言の直書き**（3言語をすり抜ける） | ESLint `no-restricted-syntax` が error（`src/**/*.tsx`）。JSX の中の日本語を捕まえる。読むのは `useT()` |
| 全体 | `npm run verify`（lint → test → build）。**落ちたまま次へ進まない** |

### 2. 検索したら、どちらのアプリか確かめる

`src/`（Next.js・本体）と `choreon-app/`（Expo・フェーズ4で停止）に
**同名のファイルが多数ある**。何も言われていなければ直すのは `src/` の方。
`choreon-app/` は ESLint の対象外なので、壊しても `npm run verify` は黙る。

### 3. 大きいファイルを丸ごと開かない

`docs/qa-checklist.html`（188KB）と `package-lock.json` が主な罠。
`grep -n` で当たりを付けて、その周りだけ `sed -n` で開く。

### 4. 学びの記録の置き場所

追記先は [docs/lessons_learned.md](docs/lessons_learned.md)、
昇格先は [.claude/rules/](.claude/rules/)、
セッションの終わりの振り返りは `/wrap-up`。

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
