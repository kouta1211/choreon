@AGENTS.md

# 新しいクラス名を足したら、Metro を積み直す

NativeWind は**そのとき見えていたクラス名だけ**を CSS に焼く。
コードベースで**初めて使うクラス**（`gap-8` `px-6` `text-3xl` など）は、
書いても**黙って効かない**。エラーも警告も出ず、余白 0・既定色のまま描かれる。

既に他の場所で使われているクラス（`gap-3` など）は効くので、
「なぜこの1つだけ効かないのか」に見える。**クラス名を疑う前にここを疑う。**

```bash
# 効かないクラスが「他で使われていない」なら、これ
grep -ro "\bgap-8\b" src/ | wc -l     # 0 なら初出
npx expo start --clear
```

これで3回はまっている。1度は効くクラス（`px-3.5`）を「効かない」と誤って
書き換えた。

# 動作確認はブラウザ（8081）で、ドラッグは別

`npx expo start` の web を Chrome DevTools MCP で見るのが速い。ただし
**合成したポインタイベントでは PanResponder が動かない**（`pointerdown` →
`pointermove` を投げてもダンサーは1pxも動かない）。ドラッグまわりは
純関数へ切り出して jest で確かめる（`snapLine.ts` がその形）。

# 検証は choreon-app の中から

```bash
npx tsc --noEmit && npx jest
```

リポジトリのルートから `npx jest` を回すと Web 版のテストまで拾って
TS の変換で落ちる。`npx expo lint` は壊れている（ルートの eslint 設定が
choreon-app を除外している）。

Web 版が無事かは**ルートで** `npm run verify`。

# 実機へ配るとき

識別子（`app.vercel.choreon`）と `eas.json` は入れてあり、**設定が正しい
ことはローカルで確かめた**（`npx expo prebuild --platform android` が
アプリ名「Choreon」・アイコン・暗い地のスプラッシュを生成する。
生成物は `.gitignore` 済みなので、確かめたら消してよい。
**prebuild は package.json の `android` / `ios` スクリプトを書き換える**ので、
Expo Go を使い続けるなら戻すこと）。

残っているのは、アカウントが要る2つだけ。

```bash
npx eas-cli login
# 鍵を EAS 側へ置く（.env.local はビルド機に届かない）
npx eas-cli env:create --environment preview --name EXPO_PUBLIC_SUPABASE_URL --value "…"
npx eas-cli env:create --environment preview --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "…"
npx eas-cli build --profile preview --platform android
```

`EXPO_PUBLIC_` の付いた値は**バンドルに入る**（＝配った先で読める）ので、
anon キー以外をここへ置かないこと。`eas.json` は値を持たず、
`environment` でどちらの束を使うかだけを指している。
- **背景で音を鳴らすなら申告が要る。** いまは画面を点けている間だけ
  （`audioMode.ts`）。続けたいなら `expo-audio` の config plugin と
  `UIBackgroundModes` を足す — 審査で見られる項目が増える。
- **共有リンクをアプリで開くには、まだ足りない。** `scheme` はあるが、
  `choreon.vercel.app/view/…` を受けるには
  `ios.associatedDomains` / `android.intentFilters` と、Web版の
  `.well-known` が要る（後者は Web版に手を入れることになる）。
