import { storage } from '@/lib/storage';

/**
 * 使い方の案内を、もう見たかどうか。Web版 tutorialPreference の翻訳。
 *
 * 端末ごとに1回だけ出す。作品ごとではない — 覚えるのは操作であって、
 * 作品の中身ではないため。
 *
 * ■ Web版との違いは「待つこと」だけ
 * あちらは localStorage を直に読むので同期で答えが出た。こちらは
 * iOS/Android が AsyncStorage なので **Promise を返す**。呼ぶ側は
 * 画面が出てから聞くことになる（描く前には読めない）。
 *
 * 読めなかったときに「見た」を返すのは Web版と同じ判断。案内は無くても
 * 操作はできるが、毎回出るのは邪魔でしかない。
 */

export const TUTORIAL_STORAGE_KEY = 'choreon.tutorial.v1';

export async function hasSeenTutorial(): Promise<boolean> {
  try {
    return (await storage.getItem(TUTORIAL_STORAGE_KEY)) === 'done';
  } catch {
    return true;
  }
}

export async function markTutorialSeen(): Promise<void> {
  try {
    await storage.setItem(TUTORIAL_STORAGE_KEY, 'done');
  } catch {
    // 書けなくても今回の案内は閉じる(次回また出るだけ)
  }
}
