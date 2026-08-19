# 機能の地図

`src/features/` の15ドメイン。**ファイルの多い順**（＝壊れると影響が大きい順に近い）。

| ドメイン | 何を持っているか | 主なもの |
| --- | --- | --- |
| `canvas` | ステージ上の操作すべて。選ぶ・動かす・向き・曲線・当たり・履歴 | `useUIStore` `useHistoryStore` `dragMath` `marquee` `stageFlip` |
| `music` | 曲・BPM・メトロノーム・時間軸（タイムライン） | `useMusicStore` `musicTimeline` `waveformPeaks` |
| `scene` | シーン（隊形）の追加・複製・並び替え・時刻・保存 | `usePositionCommit` `sceneTiming` `sceneReorder` |
| `project` | 作品そのもの。読み込み・保存・下書き・共有リンク・ステージの広さ | `useProjectStore` `persistence` `guestDraft` `stageResize` |
| `i18n` | ja / en / ko の文言。**3つそろっていないとビルドが落ちる** | `messages/` `LocaleProvider` `server.ts` |
| `viewer` | 共有リンクで見る画面（読むだけ）。補間・ピンチでの拡大 | `useViewerStore` `interpolate` `stageZoom` |
| `export` | 動画の書き出し。フレームを描いて録る | `drawFrame` `recordVideo` |
| `review` | 隊形の講評のもとになる要約作り | `formationSummary` `reviewFindings` |
| `settings` | 端末に残す設定と、作品の設定。バックアップ | `useSettingsStore` `backup` |
| `dancer` | 出る人。色・初期の向き・追加 | `newDancers` `themedColor` |
| `theme` | 10テーマの切り替え（CSS 変数の差し替え） | `catalog.ts` `themeScript.ts` |
| `assist` | 画面の文脈を集めて、次の手を出す | `useAssistPlan` `context` |
| `ai` | Gemini の呼び出し。**必ず Route Handler 経由** | `gemini.ts` |
| `tutorial` | 初回の案内（react-joyride） | `tutorialPreference` |
| `auth` | ログイン / 新規登録 | `api/auth.ts` |

## 仕様を書き足すとき

1件ずつ `<ドメイン>.md` を足す。**全部を先回りして書かない。**
触った機能の分だけ、[_template.md](_template.md) の型で書く
（先に全部そろえると、触っていないファイルから先に古くなる）。

いま実物があるのは [canvas.md](canvas.md) だけ。これが書き方の見本。
