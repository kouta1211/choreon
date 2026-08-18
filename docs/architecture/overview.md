# 全体の構造

## 1つのリポジトリに2つのアプリが入っている

```
src/            Next.js 16 (App Router) — 本体。いま開発しているのはこちら
choreon-app/    Expo SDK 57 / React Native — フェーズ4で開発を止めて保存してある
```

**同名のファイルが両方にある**（`useUIStore.ts` `useProjectStore.ts`
`sceneTiming.ts` など）。検索したらパスの先頭を確かめる。
`choreon-app/` は ESLint の対象外なので、ここを壊しても `npm run verify` は黙る。

## 端末の分業（2026-08-18 に決めた）

- **作る側（振付師）= PC / タブレットのブラウザ。** キャンバス・タイムライン
- **見る側（メンバー）= スマホのブラウザ。** 共有リンクの閲覧画面

理由と経緯は README「フェーズ6」。実装上の意味は
`.claude/rules/frontend.md` の4節。

## 画面の構成

```
/                      未ログインの下書き（端末に残す。ログイン時に取り込む）
/login /signup         Supabase Auth
/projects              作品の一覧
/projects/[projectId]  エディタ（本体）
/view/[token]          共有リンクの閲覧（読むだけ）
/offline               PWA のオフライン画面
/api/*                 Route Handler（Gemini の中継など）
```

エディタの配置は `src/components/templates/EditorLayout.tsx` に1本化してある。
`/`（下書き）と `/projects/[id]`（保存済み）は**中身の出どころが違うだけで
画面は同じ**にしたいため。

## ドメインの分け方

```
src/features/<ドメイン>/
├── api/     Supabase とのやり取り
├── hooks/   そのドメインの操作
├── lib/     DOM にも Supabase にも依存しない純粋な計算（テストを厚く書く場所）
├── store/   Zustand
└── types.ts
```

15ドメインある。一覧は [../features/README.md](../features/README.md)。
コンポーネント側は Atomic Design で別に分かれている（`src/components/README.md`）。
**層とドメインは直交している**ので、`organisms/CanvasBoard.tsx` は
`features/canvas/lib/*` を呼ぶ、という組み合わせになる。

## データの流れ（編集して保存されるまで）

```
1. 触る            organisms（CanvasBoard など）
2. 計算する        features/*/lib（純粋関数。ここだけでテストできる）
3. 画面を先に変える useProjectStore（楽観的更新）
4. 保存する        features/*/api → Supabase
5. 失敗したら戻す  ストアを元に戻して、トーストを出す
6. 成功したら積む  useHistoryStore（元に戻す / やり直す）
```

立ち位置の編集はこの流れを `features/scene/hooks/usePositionCommit` に
1本化してある。詳しくは `.claude/rules/state.md`。

**サーバーから来た props と、編集後のストアはずれる。** 描く側はストアを
優先して読む（`EditorLayout` の `live`）。ここを外すと
「数字は変わるのに画面が変わらない」という壊れ方をする。

## 保存しないもの

- **音源はサーバーへ送らない。** 端末のファイルを選ぶ方式で、Storage を使わない。
  共有された相手に渡せる手がかりは「シーンの時刻」と BPM だけ
- **画面の状態は保存しない。** 選択中・開いているシートなどは `useUIStore`
- **人の好みは端末に残す。** テーマ・言語・目盛りの出し方などは `useSettingsStore`
