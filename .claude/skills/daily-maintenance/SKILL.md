---
name: daily-maintenance
description: Choreon の保守点検。直近の変更を中心に、安全性(Supabaseの権限・秘密情報・依存の脆弱性)と保守性(重複・死んだコード・テストの穴)を調べ、安全に直せるものだけ直して PR を出す。3日に1回、午前5時のクラウドルーティンから呼ばれるが、手元で `/daily-maintenance` として回してもよい。
---

# Choreon 保守点検

このリポジトリを3日に1回ひと回り見て、**安全に直せるものだけを直し、残りは PR の本文に書いて渡す**ための手順。

判断に迷ったら直さない。ここで作る PR は、朝に人が数分で見てマージできる大きさであることが最優先で、
網羅性はその次。

## 0. 前提の確認

作業を始める前に:

```bash
node -v && npm ci
```

`npm ci` が通らなければそこで止めて、その事実だけを報告する（依存が壊れている日は、
それ以外の指摘を出しても読む余裕が無い）。

このプロジェクトの決まりごとは `CLAUDE.md` が入口で、規約の本体は `.claude/rules/`、
構造と仕様は `docs/` にある（それぞれ索引がある）。**触る所の分だけ開く。**

**Next.js は訓練データと違う版が入っている**ので、Next の API に触る前に
`AGENTS.md` の指示どおり `node_modules/next/dist/docs/` の該当ガイドを読むこと。

## 1. 見る範囲を決める

主戦場は**前回の点検からの変更**。点検は3日に1回なので、取りこぼしが出ないよう窓は78時間（3日＋余裕6時間）で見る。

```bash
git log --since="78 hours ago" --oneline
git diff --stat "HEAD@{78 hours ago}" HEAD 2>/dev/null || git diff --stat HEAD~5 HEAD
```

変更が無い日は、下の「軽い巡回」だけをやって、指摘が無ければ PR を作らずに終わる。
**何も無い日に何かを作らないこと。** 空の PR は次の回から読まれなくなる。

軽い巡回（毎回、変更の有無にかかわらず）:

- `npm audit --omit=dev` の high 以上
- `git grep -n "TODO\|FIXME\|XXX"` の新顔
- 誰からも import されていないファイル

## 2. 安全性の点検

### Supabase の権限（最優先）

スキーマが動いた日は必ず見る。`supabase/schema.sql` の差分に `create table` があれば、
そのテーブルについて次の2点が満たされているかを確認する。

（以前は `supabase/migrations/` に「既存のDBへ後から足す」SQLを番号順に置いていたが、
すべて適用済みになったため削除した。いまは schema.sql 1本が正。）

Supabase は `public` スキーマの新しいテーブルへ `anon` / `authenticated` / `service_role` の
3ロール全部に全権限を自動で付ける既定（`ALTER DEFAULT PRIVILEGES`）を持っている。
**明示的に `GRANT` していなくても `anon` に権限が付いている。**

- **個人データ**（ユーザーごとに分離すべきもの。このアプリのテーブルはほぼ全部これ）:
  `anon` の権限は剥奪されているか。schema.sql に
  `revoke all on public.<table> from anon;` があるか
- **RLS**: `alter table ... enable row level security;` と、
  `auth.uid() = user_id` を `using` と `with check` の両方に持つポリシーがあるか

片方でも欠けていれば **Issue ではなく PR の本文の先頭**に書く。401（`42501:
insufficient_privilege`）は、出てから気づくと原因が分かりにくい種類の不具合。

### 秘密情報

- `NEXT_PUBLIC_` が付いていない環境変数を、`"use client"` の付いたファイルから読んでいないか
- `.env*` がコミットされていないか（`git ls-files | grep -i env`）
- 鍵・トークンらしき文字列がソースに直書きされていないか
- Supabase の `service_role` キーがブラウザへ渡る経路に無いか

### 外から来る値

`localStorage`・URL・Supabase の応答は、書き換えられる可能性がある外部入力として
扱われているか。既存の `themePreference.ts` / `viewPreference.ts` が手本で、
**知っている値だけを通し、それ以外は既定に落とす**（壊れた JSON で画面が真っ白に
なる方が、設定が既定へ戻るよりずっと困る）。

### 依存

`npm audit --omit=dev` で high 以上が出たら、`npm audit fix` が
破壊的変更なしで直せる範囲だけ直す。メジャーが上がるものは直さず PR の本文に書く。

## 3. 保守性の点検

直近の変更を中心に:

- **同じことを2箇所以上に書いていないか。** 特に座標変換（ユニット↔百分率）、
  シーンの前後関係、テーマのトークン
- **誰も使っていないもの**（export されているが import されていない関数・型・props・
  CSS 変数・`data-testid`）
- **純粋関数なのにテストが無いもの。** `src/features/**/lib/*.ts` は
  テストがある前提で置かれている場所
- **コンポーネントの肥大**。1ファイルが 300 行を超えたら、切り出せる単位が無いか見る
- **コメントと実装の食い違い**。このリポジトリはコメントで「なぜそうしたか」を
  残す方針なので、実装だけ変えてコメントが古いままだと後の判断を誤らせる
- **AI 用のコンテキストが実態とずれていないか。** ここは黙って腐るので、
  機械で見る。リンクが切れていたら直す（指摘ではなく直す側）

```bash
node -e 'const fs=require("fs"),path=require("path");let bad=0;
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
for(const f of ["CLAUDE.md",...walk("docs").filter(x=>x.endsWith(".md")),...walk(".claude").filter(x=>x.endsWith(".md"))])
  for(const m of fs.readFileSync(f,"utf8").matchAll(/\]\(([^)#\s]+)\)/g))
    if(!/^https?:/.test(m[1])&&!fs.existsSync(path.resolve(path.dirname(f),m[1]))){console.log("BROKEN",f,"->",m[1]);bad++}
console.log(bad?`broken: ${bad}`:"links ok")'
```

  あわせて目視で1点だけ: **`docs/**` に、しきい値や既定値の数字が
  写されていないか**（`docs/README.md`「数字を写さない」）。
  写された数字はコードが動いた瞬間に嘘になる。見つけたら定数名に置き換える。
  例外は `qa-checklist.html` だけ

## 4. 規約に反していないか

**規約の本体は `.claude/rules/` にある。ここへ写さない**（写すと必ずずれる）。
差分がそこに反していないかを見て、反していれば直す。

- [.claude/rules/frontend.md](../../rules/frontend.md) … トークン・テーマ・
  座標系・3言語・PC 前提。**「一度壊すと気づきにくいもの4つ」は必ず見る**
- [.claude/rules/state.md](../../rules/state.md) … ストアの分担・保存の型
- [.claude/rules/backend.md](../../rules/backend.md) … Supabase・スキーマ
- [.claude/rules/testing.md](../../rules/testing.md) … テストの置き方

機械で見られる分は、毎回これを流す:

```bash
git grep -n "zinc-\|pink-\|slate-" -- src | wc -l     # 色の直書き。増えていたら直す
git grep -n "rounded-\[" -- src                        # 角丸の固定値
git grep -nE ":\s*any|as any" -- src           # any（lint でも落ちるが早く見つかる）
```

**規約に無いのに毎回引っかかるものを見つけたら、規約へ足す**（このファイル
ではなく `.claude/rules/` の方へ）。ここは点検の手順書であって、規約の置き場
ではない。

## 5. 直してよいもの／報告に回すもの

**直してよい**（PR に含める）:

- 未使用の export・import・変数・型の削除
- 明らかな重複の共通化（呼び出し側が3箇所以下で、意味が同じもの）
- 古くなったコメントの更新
- 純粋関数への抜けていたテストの追加
- 上の「4. 固有の約束」への違反
- 破壊的変更を伴わない依存の脆弱性修正

**直さない**（PR の本文に「見つけたが直していない」として書く）:

- 公開されている関数のシグネチャ変更
- ストアの形（state の構造）の変更
- DB スキーマ・マイグレーションの変更
- UI の見た目や文言の変更
- 「こう設計し直した方がよい」という類の提案
- 直し方が2通り以上あって、どちらが良いか根拠を持って選べないもの

迷ったら報告に回す。**朝に人がレビューするので、判断は人に残してよい。**

## 6. 検証（省略しない）

コードを1行でも変えたら:

```bash
npm run verify
```

（`lint` → `test:run` → `build` を順に走らせる）

**1つでも落ちたら PR を作らない。** 落ちた内容ごと報告に切り替える。
テストを通すためにテストの方を緩めることは絶対にしない。

## 7. 成果物

### 変更がある場合: PR を出す

```bash
git switch -c maintenance/YYYY-MM-DD
git commit  # 論理的なまとまりごとに分ける
git push -u origin maintenance/YYYY-MM-DD
```

コミットメッセージはこのリポジトリの流儀に合わせる。既存の履歴（`git log`）を見れば分かるが、
**平叙文で「何をしたか」ではなく「なぜそうなるべきか」を書く**短い英文。件名に接頭辞は付けない。

PR の本文はこの形:

```markdown
## 直したもの
- （1行ずつ。なぜ直したかまで書く）

## 見つけたが直していないもの
- （なぜ直さなかったかを添える。判断が要るもの・大きいものはここ）

## 確認したが問題が無かったもの
- Supabase の権限とRLS / 秘密情報 / 依存の脆弱性 / …

## 検証
npm run verify — 通過（テスト NNN 件）
```

`## 直したもの` が空なら PR を作らない。

**コミットメッセージは、このリポジトリの形に揃える** — 日本語・プレフィックス
無し・1行目に「何をしたか」、本文に「なぜ」。`feat:` などは使わない
（全履歴がそう揃っているため。詳しくは `/commit`）。

### 変更が無い場合

PR も Issue も作らない。**「見たが何も無かった」で終わってよい。**
毎回何かを見つけようとすると、指摘の質が落ちて読まれなくなる。

ただし `npm run verify` が落ちた・`npm ci` が通らなかった・Supabase の権限に
穴があったなど、**人が今日中に知るべきこと**があった場合だけは、
コードを変えずに Issue を1件立てる。

## 8. 学んだことを残す

**同じ指摘が2回目なら、それは点検の問題ではなく規約の穴。**

- 今回の点検で分かったこと（見落としやすい形・調べ方のコツ）は
  [docs/lessons_learned.md](../../../docs/lessons_learned.md) に日付見出しで追記する
- **2回続けて同じ種類の指摘が出たら、`.claude/rules/` の該当ファイルへ
  昇格させて、次からは機械か規約で止まるようにする**
- 機械で止められるもの（lint ルール・テスト）なら、文章ではなく**仕掛け**を足す

**何も無かった日は、ここにも書かない。**
