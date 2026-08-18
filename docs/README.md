# docs の歩き方

このディレクトリは**人と AI の両方が読む前提**で置いてある。
書く前に、ここの表で行き先を決める。

| 知りたいこと | 開くもの |
| --- | --- |
| 全体の構造・データの流れ | [architecture/overview.md](architecture/overview.md) |
| なぜその作りにしたか | README「開発の記録」→ 新しい決定は [architecture/decisions/](architecture/decisions/) |
| テーブルと権限 | [data-model.md](data-model.md) |
| ある機能の仕様 | [features/](features/)（まず [features/README.md](features/README.md) の地図） |
| 過去にハマったこと | [lessons_learned.md](lessons_learned.md) |
| 実機で何を確かめるか | `qa-checklist.html`（**188KB。全部開かず grep で該当章だけ**） |

## 書く場所の決め方

- **仕様**（いま何がどう動くか） → `features/<機能>.md`
- **決定**（なぜそうしたか・他に何を捨てたか） → `architecture/decisions/`
- **失敗**（次に同じ穴に落ちないための教訓） → `lessons_learned.md`
- **手順**（毎回同じ手を繰り返すもの） → `.claude/skills/` か `.claude/commands/`
- **規約**（コードの書き方） → `.claude/rules/`

## 書かない場所

**コードの隣に既にある説明を、ここへ写さない。** 写すと必ず片方が古くなる。

- コンポーネントの層 → `src/components/README.md`
- 列の意味・制約の理由 → `supabase/schema.sql` のコメント
- 関数の意図 → その関数の上のコメント

ここに置くのは、**1つのファイルを読んでも分からないこと**（複数のファイルを
またぐ流れ、選ばなかった案、外から見た振る舞い）だけ。

## 数字を写さない

しきい値・既定値・秒数を docs に書くと、**コードを直したときにこちらが
黙って嘘になる**（そして誰も気付かない）。定数の**名前と置き場所**を書く。

例外は `qa-checklist.html` だけ。あれは user が画面を見て○×を即答する
ための台本なので、具体的な数字が要る。書くときにコードから写す。
