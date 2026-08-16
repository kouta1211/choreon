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
