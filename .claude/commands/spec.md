---
description: ユーザーの曖昧なアイデアや断片的な言葉から、プロレベルの詳細な仕様書を自動生成して保存する
---

ユーザーから入力された断片的なアイデアを受け取り、以下のステップを自律的に実行してください。

1. **文脈の補完と構造化:** `docs/architecture/overview.md`、`docs/data-model.md` などの文脈を読み込み、目的、UI/UX仕様、データ構造、API/ロジック、エラーハンドリングを含む詳細な仕様書を作成する。
2. **仕様書の自動保存:** 作成した仕様書をマークダウン形式で `docs/features/` 配下に適切なファイル名で新規作成・保存する（許可不要）。
3. **次のアクション提示:** 「仕様書を保存しました。この仕様のまま実装に進めてもよろしいですか？」と確認する。

---

## パスについて

指示にあった `docs/00_architecture.md` / `docs/01_data_model.md` /
`docs/02_features/` は**このリポジトリには無い**。実際の置き場所は上のとおり
（2026-08-18 に、リポジトリを分析して決めた構成）。地図は
[docs/README.md](../../docs/README.md)。

## 1 で読むもの

**全部読まない。** アイデアに関係する所だけ:

- [docs/architecture/overview.md](../../docs/architecture/overview.md) … 全体の構造・データの流れ
- [docs/data-model.md](../../docs/data-model.md) … 表4つと権限（データを触るなら）
- [docs/features/README.md](../../docs/features/README.md) … 15ドメインの地図。**どこに属する話かを先に決める**
- [docs/lessons_learned.md](../../docs/lessons_learned.md) … 同じ穴に落ちないため
- 関係する `.claude/rules/` … 画面なら frontend、保存なら state と backend

**既にある機能の話なら、`docs/features/<ドメイン>.md` があるか先に見る。**
あれば新規作成せず、そこへ書き足す。同じ機能の仕様書を2つ作らない。

## 2 の書き方

型は [docs/features/_template.md](../../docs/features/_template.md)。守ること:

- **しきい値や既定値の「数字」を書かない。** 定数の名前と置き場所を書く
  （数字を写すと、コードを直した瞬間に嘘になる。
  [docs/README.md](../../docs/README.md)「数字を写さない」）
- **専門語で書かない。** store / props / state / RLS は user 向けの文には
  出さない。「端末に覚えます」「サーバーへ送られていません」のように書く
- **決めきれない所は「未決」と書いて残す。** それらしく埋めない。
  そこが後で user に聞くべき所

**作る側は PC / タブレット、見る側はスマホ**という分業がある
（README「フェーズ6」）。どちらの画面の話かを最初に決める。

## 3 の前に

**選択肢が2つ以上あって user の好みで決まる所は、勝手に決めずに並べて聞く。**
逆に、コードを読めば分かること・慣習で決まることは聞かない。

大きい機能なら、実装へ進む前に Plan Mode で手順を確かめる。
