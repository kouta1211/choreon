# コンポーネントの置き場所（Atomic Design）

他プロジェクト（portfolio-site / meishi-application / payment-optimizer）と
揃えるため、コンポーネントは Atomic Design の層で分ける。

```
src/components/
├── atoms/       最小単位。他のアプリ内コンポーネントを組み立てない
├── molecules/   atomsを組み合わせた部品。ストアには触らない
├── organisms/   ストアや業務ロジックを持つ複合的な部品
└── hooks/       表示まわりの共通フック（コンポーネントではない）
```

`pages/` 層は作らない。App Router の `src/app/**/page.tsx` 自体がページ層を
兼ねるため。

## どの層に置くか

判断は **「アプリの状態（Zustandのストア）に触るか」** を基準にする。
見た目の複雑さではなく依存の向きで決めた方が、迷いにくく後からもずれない。

| 層 | 目安 | 例 |
|---|---|---|
| atoms | ストアに触らない。propsだけで完結し、他のアプリ内コンポーネントも使わない | `Tooltip` `Switch` `RotationHandle` |
| molecules | ストアに触らない。atomsや他のmoleculesを組み立てる | `InlineEditableText` `BottomSheet` `SceneThumbnail` |
| organisms | ストアを読む・書く、またはSupabaseを呼ぶ | `CanvasBoard` `SceneDock` `DancerInspector` |

**依存は下向きだけ**。organisms → molecules → atoms の順にしか import しない。
molecules がストアを読み始めたら、それは organisms へ移すサイン。

## ドメインのロジックは `src/features/` に残す

Atomic Design は**コンポーネントの分け方**であって、ドメインの分け方ではない。
Supabaseへの問い合わせ・純粋な計算・Zustandのストアは、これまでどおり
`src/features/{project,scene,dancer,canvas,auth}/` に置く。

```
src/features/scene/
├── api/      Supabaseとのやり取り
├── hooks/    そのドメインの操作をまとめたフック
├── lib/      DOMにもSupabaseにも依存しない純粋な計算（テストしやすい）
└── types.ts
```

コンポーネントを層で分けると、どのファイルがどのドメインのものか名前でしか
分からなくなる。ドメインの中身まで一緒に動かすと、その手がかりまで失われる
ので、ロジック側は分けたままにしている。

## テスト

テストはコンポーネントと同じ場所に置く（`Foo.tsx` の隣に `Foo.test.tsx`）。
`lib/` の純粋関数は特に手厚く書く。ここが壊れると画面のどこが崩れるかが
見えにくいため。
