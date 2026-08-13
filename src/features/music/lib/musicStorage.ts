/**
 * 選んだ曲を端末に置いておくための入れ物(IndexedDB / Dexie)。
 *
 * 以前は ObjectURL をメモリに持つだけだったので、再読み込みするたびに
 * 曲が消え、確認のたびにファイルを選び直すことになっていた。振付を直しては
 * 曲に合わせて見る、という往復が最も多い作業なので、ここが毎回リセットされると
 * 手が止まる。
 *
 * localStorage ではなく IndexedDB を使うのは、音源が数MBあるため。
 * localStorage は文字列しか置けず(Base64にすると4/3に膨らむ)、容量も
 * 5MB前後で頭打ちになる。IndexedDB は Blob をそのまま置ける。
 *
 * 作品ごとに1曲。別の作品を開いたときに前の曲が鳴っていては困る。
 *
 * ここに置くのはあくまで【この端末の控え】であって、共有される作品の一部では
 * ない。音源をサーバーへ上げない方針(useMusicStore のコメント参照)は変えて
 * いないので、他の人に共有しても曲は付いていかない。
 *
 * ■ 生の IndexedDB から Dexie へ移した理由
 * open / onupgradeneeded / transaction / onsuccess を自分で繋ぐと、
 * 3つの操作(保存・読み出し・削除)のために【毎回同じ Promise の配線】を
 * 書くことになる。DB名・版・ストア名も文字列で散る。Dexie は同じことを
 * 宣言1つで済ませ、Promise をそのまま返す。
 * **保存されるデータの形と DB 名・版は変えていない**ので、既に控えてある
 * 曲はそのまま読める(version(1) のスキーマが以前の createObjectStore と
 * 同じ「キーだけのストア」になる)。
 */

import Dexie, { type Table } from "dexie";

const DB_NAME = "choreon-music";
const STORE = "tracks";

export type StoredTrack = { file: File; fileName: string };

class MusicDatabase extends Dexie {
  /** キーは projectId。作品ごとに1曲なので、値は1件だけ持つ */
  tracks!: Table<StoredTrack, string>;

  constructor() {
    super(DB_NAME);
    // 空のスキーマ文字列 = キーを外から与えるストア(out-of-line keys)。
    // 以前の createObjectStore(STORE) と同じ形で、既存のデータと互換
    this.version(1).stores({ [STORE]: "" });
  }
}

/**
 * IndexedDB が使えない環境(プライベートモードなど)では null を返し、
 * 呼び出し側は「保存できないだけ」として動き続ける。
 *
 * インスタンスは1つだけ作って使い回す。呼ばれるたびに開くと、
 * 別のタブが古い版を掴んでいるときに接続が積もる。
 */
let database: MusicDatabase | null | undefined;

function db(): MusicDatabase | null {
  if (database !== undefined) return database;

  if (typeof indexedDB === "undefined") {
    database = null;
    return database;
  }
  try {
    database = new MusicDatabase();
  } catch {
    database = null;
  }
  return database;
}

export async function saveTrack(
  projectId: string,
  track: StoredTrack,
): Promise<void> {
  try {
    await db()?.tracks.put(track, projectId);
  } catch {
    // 容量超過・プライベートモードなど。控えられないだけで、
    // いま鳴っている曲には影響しない
  }
}

export async function loadTrack(
  projectId: string,
): Promise<StoredTrack | null> {
  try {
    const value = await db()?.tracks.get(projectId);
    // 保存した形と違うものが入っていたら無視する(版を上げる前のデータなど)
    if (!value || !(value.file instanceof Blob)) return null;
    return value;
  } catch {
    return null;
  }
}

export async function deleteTrack(projectId: string): Promise<void> {
  try {
    await db()?.tracks.delete(projectId);
  } catch {
    // 消せなくても、画面の側では既に外れている
  }
}
