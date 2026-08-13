/**
 * 使い方の案内を、もう見たかどうか。
 *
 * 端末ごとに1回だけ出す。作品ごとではない — 覚えるのは操作であって、
 * 作品の中身ではないため。
 *
 * zustand の persist ではなく手書きにしているのは、themePreference /
 * metronomePreference / timelinePreference と作法を揃えるため。
 * localStorage は書き換えられる外部入力なので、読むときに必ず検証する。
 */

export const TUTORIAL_STORAGE_KEY = "choreon.tutorial.v1";

export function hasSeenTutorial(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_STORAGE_KEY) === "done";
  } catch {
    // プライベートモード等で触れない。毎回出すより、出さない方を選ぶ
    // (案内は無くても操作はできるが、毎回出るのは邪魔でしかない)
    return true;
  }
}

export function markTutorialSeen(): void {
  try {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, "done");
  } catch {
    // 書けなくても今回の案内は閉じる(次回また出るだけ)
  }
}
