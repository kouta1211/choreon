import {
  BackupFormatError,
  buildBackup,
  parseBackup,
  type Backup,
} from "@/features/settings/lib/backup";
import type { Dancer } from "@/features/dancer/types";
import type { Position, Scene } from "@/features/scene/types";
import type { Project } from "@/features/project/types";
import { GUEST_PROJECT_ID } from "@/features/project/lib/guestProject";

/**
 * ログインせずに作った下書きを、**このブラウザに残す**。
 *
 * ■ なぜ要ったか
 * 始め方を選ぶ画面は「作ったものはこの端末にだけ残ります」と書いているのに、
 * **実際には残っていなかった**。下書きはメモリの上だけにあり、再読み込み・
 * タブを閉じる・戻るのどれでも消えていた。UnsavedChangesGuard が離れる直前に
 * 確認を出してはいるが、**iOS Safari は背景のタブを黙って捨てる**ので、
 * アプリを切り替えて戻ってきただけで消える。そこには確認も出ない。
 * 1時間かけて組んだ隊形が、書いてあることと違って失われる。
 *
 * ■ 「どちらが新しいか」は起きない
 * 以前ここを見送った理由は、localStorage へ逃がすと同期を抱え込むから
 * だった。**下書きにはサーバー側の控えが無い**ので、その問いは立たない。
 * クラウドへ保存した時点で控えは捨てる（markSaved の後）。
 *
 * ■ 形は書き出しと同じものを使う
 * `backup.ts` が既に「作品ぜんたいを1つの JSON にする／読むときに検証する」
 * を持っている。**localStorage は書き換えられる外部入力**なので、検証の要る
 * 場所を新しく書き起こさない。
 *
 * ■ 音は入らない
 * 音源は IndexedDB（musicStorage.ts）に別で入っている。ここに抱えると
 * localStorage の容量（5MB前後）をすぐ超える。
 */

const DRAFT_KEY = "choreon.draft.v1";

/** 検証に失敗したときの文言。画面には出さないので素の英語で足りる */
const SILENT_WORDS = {
  unreadableFile: "unreadable",
  wrongShape: "wrong shape",
  wrongVersion: "wrong version",
  noProject: "no project",
  incomplete: "incomplete",
};

export type GuestDraft = {
  project: Project;
  dancers: Dancer[];
  scenes: Scene[];
  positions: Position[];
};

export function saveGuestDraft(draft: GuestDraft): void {
  try {
    const backup = buildBackup({
      ...draft,
      exportedAt: new Date().toISOString(),
    });
    localStorage.setItem(DRAFT_KEY, JSON.stringify(backup));
  } catch {
    // プライベートモードや容量超過で書けないことがある。**今の画面は
    // そのまま続ける** — 保存できないことを理由に編集を止める方が困る
  }
}

/**
 * 残してある下書き。無ければ null。
 *
 * 壊れていたら**捨てて null を返す**。読めない値を持ち続けると、
 * 毎回同じところで転ぶ。
 */
export function loadGuestDraft(): GuestDraft | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(DRAFT_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  let backup: Backup;
  try {
    backup = parseBackup(raw, SILENT_WORDS);
  } catch (error) {
    if (error instanceof BackupFormatError) forgetGuestDraft();
    return null;
  }

  const now = new Date().toISOString();
  // 書き出した形には持ち主も作成日も入っていない（入れても使えない）。
  // 下書きの決まった値で組み立て直す
  return {
    project: {
      ...backup.project,
      id: GUEST_PROJECT_ID,
      userId: "guest",
      isMetronomeEnabled: backup.project.isMetronomeEnabled ?? false,
      // 曲の名前は書き出しに入っていない（音源ごと端末の外へは出さない）
      musicTitle: null,
      shareToken: null,
      isShared: false,
      createdAt: now,
      updatedAt: now,
    },
    dancers: backup.dancers.map((dancer) => ({
      ...dancer,
      projectId: GUEST_PROJECT_ID,
      createdAt: now,
    })),
    scenes: backup.scenes.map((scene) => ({
      ...scene,
      projectId: GUEST_PROJECT_ID,
    })),
    positions: backup.positions,
  };
}

export function forgetGuestDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // 消せなくても、次に保存すれば上書きされる
  }
}
