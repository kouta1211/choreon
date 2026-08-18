# コーディング規約の索引

**全部読まない。** いま触る層のファイルだけを開く。

| 触るもの | 読むファイル |
| --- | --- |
| 画面・コンポーネント・文言・見た目 | [frontend.md](frontend.md) |
| Supabase・スキーマ・Route Handler・認証 | [backend.md](backend.md) |
| Zustand のストア・履歴・保存 | [state.md](state.md) |
| テスト・`npm run verify`・動作確認の台本 | [testing.md](testing.md) |

規約の一部は、既にコードの隣に置いてある。**そちらが正**で、ここには写さない。

- コンポーネントをどの層に置くか → `src/components/README.md`
- Next.js 16 の API（訓練データと違う） → `AGENTS.md` と `node_modules/next/dist/docs/`
- Supabase の GRANT / RLS の確認手順 → user のグローバル `CLAUDE.md`

## このリポジトリで最初に踏む地雷

**`src/` と `choreon-app/` は別のアプリ。** `useUIStore.ts` `useProjectStore.ts`
`sceneTiming.ts` などは**両方に同名で存在する**。`choreon-app/` は Expo 版で、
フェーズ4で**開発を止めた状態のまま保存してある**（README「開発の記録」）。

- 何も言われていなければ、直すのは **`src/` の方だけ**
- 検索したら、パスが `src/` で始まっているかを毎回確かめる
- `choreon-app/` は ESLint の対象外（`eslint.config.mjs` で除外済み）。
  ここを直しても `npm run verify` は何も言わない
