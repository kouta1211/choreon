import { setAudioModeAsync } from 'expo-audio';

/**
 * 音の鳴らし方を、アプリの用途に合わせて1回だけ決める。
 *
 * ■ なぜ要るか — **マナーモードで鳴らないため**
 * `setAudioModeAsync` を一度も呼ばないと、iOS の音の区分は既定の
 * `soloAmbient` のままで、**着信スイッチを切っている間は消音される**
 * （expo-audio は起動時に何も設定しない。呼んで初めて区分が変わる）。
 * 稽古場でスマホがマナーモードなのはむしろ普通なので、曲もメトロノームも
 * 鳴らないまま「壊れている」と見える。
 *
 * ■ 背景で鳴らし続けるのは【まだ入れない】
 * `shouldPlayInBackground` を立てると、画面を消しても鳴り続けられるが、
 * iOS では `UIBackgroundModes: audio` の申告が要り、審査の観点も変わる。
 * 出す形（EAS ビルド）を決めてから入れる。いまは画面を点けている間だけ。
 *
 * ■ 他のアプリを止めない
 * `interruptionMode` は既定の `mixWithOthers` のまま。曲を確認するだけの
 * ために、相手の再生を勝手に止めない。
 *
 * Web では何もしない関数なので、分岐を書かずにそのまま呼んでよい
 * （`AudioModule.web.js` の `setAudioModeAsync` は空）。
 */
export async function configureAudioMode(): Promise<void> {
  try {
    await setAudioModeAsync({ playsInSilentMode: true });
  } catch {
    // 設定できなくても、音そのものは（マナーモードでなければ）鳴る。
    // ここで止めると起動が止まるので、飲み込む
  }
}
