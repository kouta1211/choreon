/**
 * 選んだ曲を端末に置いておくための入れ物(IndexedDB)。
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
 */

const DB_NAME = "choreon-music";
const DB_VERSION = 1;
const STORE = "tracks";

export type StoredTrack = { file: File; fileName: string };

/** IndexedDB が使えない環境(プライベートモードなど)では null を返し、
 * 呼び出し側は「保存できないだけ」として動き続ける */
function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") return resolve(null);

    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      return resolve(null);
    }

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    // 別のタブが古い版を掴んでいると開けないままになる
    request.onblocked = () => resolve(null);
  });
}

function run<T>(
  mode: IDBTransactionMode,
  body: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T | null> {
  return new Promise((resolve) => {
    void openDb().then((db) => {
      if (!db) return resolve(null);
      try {
        const request = body(db.transaction(STORE, mode).objectStore(STORE));
        request.onsuccess = () => {
          resolve(request.result);
          db.close();
        };
        request.onerror = () => {
          resolve(null);
          db.close();
        };
      } catch {
        db.close();
        resolve(null);
      }
    });
  });
}

export async function saveTrack(
  projectId: string,
  track: StoredTrack,
): Promise<void> {
  await run("readwrite", (store) => store.put(track, projectId));
}

export async function loadTrack(
  projectId: string,
): Promise<StoredTrack | null> {
  const value = await run<StoredTrack | undefined>("readonly", (store) =>
    store.get(projectId),
  );
  // 保存した形と違うものが入っていたら無視する(版を上げる前のデータなど)
  if (!value || !(value.file instanceof Blob)) return null;
  return value;
}

export async function deleteTrack(projectId: string): Promise<void> {
  await run("readwrite", (store) => store.delete(projectId));
}
