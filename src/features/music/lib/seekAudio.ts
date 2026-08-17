/** 待ちきれなかったときに諦めるまで。**画面を止めない**方を優先する */
const READY_TIMEOUT_MS = 3000;

/**
 * 作りたての `<audio>` を、指定の秒数へ送る。
 *
 * ■ 何のための用心か（Chrome では要らない）
 * `new Audio(url)` の直後に `currentTime` へ代入すると、仕様では
 * 「再生を始める位置」として覚えられ、読み込みが終わってから適用される。
 * **Chrome では実際そう動く**（`readyState:0` のまま代入しても値は残った）。
 *
 * ただし Safari は昔から、**読み込み前の seek を取りこぼす**ことで知られる。
 * このアプリの配る先は稽古仲間の iPhone で、書き出しも「新しい iPhone の
 * Safari で」と案内している。取りこぼすと**曲の頭から鳴る**ので、
 * 頭出しが黙って無視される — 数字は入っていて音も鳴るので、
 * **画面からは気づけない**壊れ方になる。
 *
 * 待つのは1回きり、上限3秒。**Chrome では待ちはほぼ0**なので、
 * 用心の代金は安い。
 *
 * 長く生きている `<audio>`（SceneDock / ViewerMusic）は既に読み終わって
 * いるので、あちらは直接代入で足りる。**要るのは作りたての要素だけ。**
 */
export async function seekFreshAudio(
  audio: HTMLAudioElement,
  seconds: number,
): Promise<void> {
  const target = Math.max(0, seconds);

  // 長さが分かるまで待つ。分かってから送れば、どのブラウザでも取りこぼさない
  if (audio.readyState < HTMLMediaElement.HAVE_METADATA) {
    await once(audio, ["loadedmetadata", "error"]);
  }

  /* 待っても分からなかったら諦める。**ここで待ちを重ねない** —
     送れない相手に seek の完了を待つと、待ち時間が2回ぶんになる。
     曲の頭から鳴ることになるが、書き出しは止めない */
  if (audio.readyState < HTMLMediaElement.HAVE_METADATA) return;

  audio.currentTime = target;

  /* 送り終わるのも待つ。ここを待たずに play() すると、頭の何十msかが
     送る前の位置（＝曲の頭）で鳴ることがある */
  if (Math.abs(audio.currentTime - target) > 0.05) {
    await once(audio, ["seeked", "error"]);
  }
}

/** どれか1つが来るまで。来なくても READY_TIMEOUT_MS で諦める */
function once(target: HTMLAudioElement, events: string[]): Promise<void> {
  return new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      for (const event of events) target.removeEventListener(event, finish);
      clearTimeout(timer);
      resolve();
    };
    // **待ち続けない。** 音が読めない端末でも書き出しは進める
    const timer = setTimeout(finish, READY_TIMEOUT_MS);
    for (const event of events) {
      target.addEventListener(event, finish, { once: true });
    }
  });
}
