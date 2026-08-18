# 画面まわりの規約（Next.js 16 / React 19 / Tailwind 4）

## 0. Next.js は訓練データと違う

`AGENTS.md` のとおり、入っている Next は 16 系で**破壊的変更が入っている**。
`next/*` の API に触る前に `node_modules/next/dist/docs/` の該当ガイドを読む。
記憶で書かない。

## 1. コンポーネントをどこに置くか

判断基準は**「Zustand のストアに触るか」**。見た目の複雑さでは決めない。
表と例は `src/components/README.md` にある。要約だけ:

```
atoms      ストアに触らない。propsだけで完結
molecules  ストアに触らない。atoms を組み立てる
organisms  ストアを読む・書く / Supabase を呼ぶ
templates  organisms の配置だけ。2ページ以上が同じ配置を使うときだけ作る
ui/        shadcn 由来の汎用パーツ。色や余白は必ずトークン経由で当てる
```

**依存は下向きだけ。** molecules がストアを読み始めたら organisms へ移す合図。

## 2. 色・余白・角丸は必ずトークン

テーマが10種あり、**CSS 変数の差し替えだけで全部切り替わる**（`src/app/themes.css`）。
生の色や `rounded-[12px]` を書くと、その1箇所だけテーマに追従しなくなる。

- 色 … `text-fg-strong` `bg-surface` `text-fg-muted` のようなトークン名
- 余白 … `px-gutter` `py-unit`
- 角丸 … `rounded-xl` など Tailwind の段階。`rounded-[...]` は使わない

新しい値が要るなら、まずトークンを足すことを検討する。

## 3. 文言は3言語そろえて足す

`src/features/i18n/messages/` に `ja.ts` / `en.ts` / `ko.ts` があり、
**型で3つそろっていることを強制している**。1つでも欠けるとビルドが落ちる。
画面に出す文字列を直書きしない。読むのは `useT()`（`LocaleProvider`）、
サーバー側は `src/features/i18n/server.ts`。

## 4. 作る画面は PC 前提（2026-08-18 の方針転換）

README「フェーズ6」で、**作る側＝PC / タブレットのブラウザ、見る側＝スマホ**に
割った。だから:

- キャンバス・タイムラインなど**作成画面は PC のレイアウトと操作性で作る**
- スマホ幅向けの無理な折りたたみや、複雑なタッチ制御は**足さない**
- 修飾キー（Shift / Ctrl / ⌘）や右クリックを前提にした操作を**足してよい**
- ただし**既にあるスマホ幅の作成 UI は消さない**。狭い画面には
  `NarrowScreenNotice` が出るが「このまま開く（非推奨）」で入れる道を残してある。
  ここを消すと、入った人が操作できない画面に閉じ込められる
- 閲覧側（`/view`）はスマホが主戦場。ここでタッチを削らない

## 5. 画面幅で分けるときは CSS でやる

`useScreenKind` はサーバーでは `"phone"` を返す。これで JSX を出し分けると
**初回描画が一瞬スマホ用になってから切り替わる**（ちらつく）。
`min-[768px]:hidden` のように **CSS のブレークポイントで消す**。

## 6. 新しく作る前に、既にある部品を探す

`src/components/atoms` と `molecules` に、汎用のものはだいたい揃っている
（`PressableButton` `BottomSheet` `SegmentedControl` `Tooltip` など）。
同じ見た目を2つ作ると、テーマを直すときに片方が取り残される。
