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

### 1. 説明の量は、仕事の大きさに合わせる

| 種類 | 出し方 |
| --- | --- |
| **軽微** … 挙動が変わらない・自明。誤字、文言、色や余白、import の整理、既に合意した方針をもう一度当てるだけ | **前置きも説明もなし。差分と結論だけを最速で。** |
| **それ以外** … 新しい設計の選択がある / 既存の挙動が変わる / 複数ファイルにまたがる | **なぜその設計にしたかを先に説明し、提案してからコードを出す。**大きく作らず、小さく区切る |

**どちらでも守るもの**（user は React を学習中で、ここが目的）:

- 既存コードを直したときは、**変えた所だけ**を変更前 → 変更後で示す。
  ファイル全体を貼り直さない
- **`useState` / `useEffect` / props など基礎の概念が新しく出てきたら、
  軽微な修正でも一行だけ触れる。** 他の書き方があるならそれも
- 大きい機能は、書く前に Plan Mode で方針を確かめる

迷ったら「それ以外」に倒す。**説明を省いて速く出す価値より、
読んで分かる価値の方が高い。**

### 2. 止まらずに進む

- エラーや実装の壁は、**許可を待たず自分で調べて直して前へ進む**。
  「〇〇してもいいですか」を極力言わない
- **安全なコマンドは黙って実行する。** ファイルの読み書き、`grep`、
  `npm run lint` / `test` / `build`、`git status` / `diff` / `log`。
  実行して結果を確かめるまでが一手
- 方針を一度合意したら、その先の**戻せる手順は聞き直さない**

**それでも一度確認するもの**（取り返しがつかない・外へ出る）:
`git push` / デプロイ / DB のスキーマ変更 / ファイルやデータの削除 /
外部サービスへの送信。ここだけは、進める前に一言置く。

### 3. 品質を速さと引き換えにしない

いま機械で担保していること。**下がっていたら直す。**

| 何 | どう担保しているか |
| --- | --- |
| `any` 禁止 | ESLint `@typescript-eslint/no-explicit-any` が error。`src/` の使用箇所は 0 |
| 型の厳格さ | `tsconfig.json` の `strict: true` |
| **保存し忘れ**（`await` の付け忘れ） | ESLint `no-floating-promises` が error（`src/` の本番コードのみ）。意図して投げっぱなしにするものは `void` を付ける |
| 全体 | `npm run verify`（lint → test → build）。**落ちたまま次へ進まない** |

- **テストの無いコード変更は原則しない。** 特に `features/*/lib/` の純粋関数
- **例外処理とバリデーションは最初から書く。** 後で足す約束をしない
- 直したバグには、**そのバグを捕まえるテスト**を足す。足したら
  直した側を一時的に戻して、**本当に落ちることを確かめる**

### 4. 学んだことを自分で記録する

**同じ穴に2回落ちないためのファイルが `docs/lessons_learned.md`。**
以下に当たったら、その場で追記してよい（許可を待たない）。

- 原因が想像とずれていた不具合を直した
- ライブラリやフレームワークが想定と違う挙動をした
- **user から指摘を受けた**（作り方・書き方・出し方のどれでも）

書くのは「起きたこと」ではなく**「次はどうするか」**。
同じ教訓が2回出たら、箇条書きを増やさず `.claude/rules/` の該当ファイルへ
昇格させる。セッションの終わりにまとめて振り返るときは `/wrap-up`。

### 5. 検索したら、どちらのアプリか確かめる

`src/`（Next.js・本体）と `choreon-app/`（Expo・フェーズ4で停止）に
**同名のファイルが多数ある**。何も言われていなければ直すのは `src/` の方。
`choreon-app/` は ESLint の対象外なので、壊しても `npm run verify` は黙る。

### 6. 大きいファイルを丸ごと開かない

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
