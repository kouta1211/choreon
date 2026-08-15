import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';

import { storage } from '@/lib/storage';

/**
 * 選んだ曲を**この端末に覚えておく**。
 *
 * ■ ピッカーが返す場所は一時的
 * `copyToCacheDirectory` で写された先はキャッシュなので、端末が容量を
 * 空けるときに消される。アプリを開き直したら曲が無い、が起きる。
 * **消されない領域（document）へもう一度写して、その場所を覚える。**
 *
 * ■ 作品ごとに1曲
 * ファイル名を作品の id にしてある。別の作品を開けば別のファイルを見に行き、
 * 同じ作品で選び直せば上書きされる。**作品と曲がずれない**のが要点。
 *
 * ■ Web では写さない
 * ブラウザに「アプリの領域」は無い（Web版は IndexedDB に実体を入れている）。
 * こちらは選んだセッションの間だけ持つ — ネイティブ版の主目的はスマホで、
 * Web は確認用なので、そこまでの作り込みはしない。
 *
 * ■ 覚えるのは【場所と名前】だけ
 * 音そのものはファイルとして置かれ、サーバーへは出さない（共有した相手の
 * 端末で曲が鳴らないのはこのため）。
 */

/** 端末に置くときのキー。作品ごとに1件 */
const MUSIC_KEY_PREFIX = 'choreon.music.v1.';

/** 曲を入れておく場所。消されない領域の下に1つ作る */
const MUSIC_DIR = 'music';

export type StoredMusic = {
  /** 写したあとの場所。ここから鳴らす */
  uri: string;
  /** 画面に出す名前。元のファイル名 */
  name: string;
};

function keyFor(projectId: string): string {
  return `${MUSIC_KEY_PREFIX}${projectId}`;
}

/**
 * 選ばれたファイルをアプリの領域へ写し、場所を覚える。
 *
 * 写せなかった場合でも、**選んだ場所そのままで返す** — その回は鳴らせる。
 * 覚えられないだけで、選び直せば済む（ここで例外にすると、曲を選ぶこと
 * 自体ができなくなる）。
 */
export async function keepMusic(
  projectId: string,
  picked: { uri: string; name: string },
): Promise<StoredMusic> {
  if (Platform.OS === 'web') return picked;

  try {
    const dir = new Directory(Paths.document, MUSIC_DIR);
    if (!dir.exists) dir.create({ intermediates: true });

    // 拡張子は元の名前から拾う。付いていないと端末が形式を判別できない
    const extension = picked.name.includes('.') ? picked.name.split('.').pop() : 'mp3';
    const destination = new File(dir, `${projectId}.${extension}`);
    if (destination.exists) destination.delete();
    new File(picked.uri).copy(destination);

    const stored: StoredMusic = { uri: destination.uri, name: picked.name };
    await storage.setItem(keyFor(projectId), JSON.stringify(stored));
    return stored;
  } catch {
    // 写せなくても、その回は選んだ場所から鳴らせる
    return picked;
  }
}

/**
 * 覚えてある曲を返す。無ければ null。
 *
 * **ファイルが消えていたら覚えも捨てる。** 端末の掃除や、書き出し前の
 * 手動削除で消えることがあり、場所だけ残っていると「曲があるのに鳴らない」
 * という直しようのない状態になる。
 */
export async function restoreMusic(projectId: string): Promise<StoredMusic | null> {
  if (Platform.OS === 'web') return null;

  const raw = await storage.getItem(keyFor(projectId));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as StoredMusic;
    if (typeof parsed?.uri !== 'string' || typeof parsed?.name !== 'string') return null;
    if (!new File(parsed.uri).exists) {
      await storage.removeItem(keyFor(projectId));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** 曲を外す。覚えもファイルも消す */
export async function forgetMusic(projectId: string): Promise<void> {
  if (Platform.OS === 'web') return;

  const raw = await storage.getItem(keyFor(projectId));
  await storage.removeItem(keyFor(projectId));
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw) as StoredMusic;
    const file = new File(parsed.uri);
    if (file.exists) file.delete();
  } catch {
    // 消せなくても覚えは捨ててある。次に選べば上書きされる
  }
}
