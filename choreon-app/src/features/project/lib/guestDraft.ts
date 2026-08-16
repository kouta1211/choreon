import { storage } from '@/lib/storage';
import {
  BackupFormatError,
  buildBackup,
  parseBackup,
  type Backup,
} from '@/features/settings/lib/backup';
import type { Dancer } from '@/features/dancer/types';
import type { Position, Scene } from '@/features/scene/types';
import type { Project } from '@/features/project/types';

/**
 * ログインせずに作った下書きを、**この端末に残す**。
 *
 * ■ なぜ要ったか
 * 始め方を選ぶ画面は「作ったものはこの端末にだけ残ります」と書いている
 * のに、**実際には残っていなかった** — 下書きは毎回サンプルから作り直され、
 * アプリを閉じれば全部消えていた。1時間かけて組んだ隊形が、次に開いたら
 * 元のサンプルに戻っている。書いてあることと違う。
 *
 * ■ Web版が残していない理由は、こちらには当てはまらない
 * あちらは「localStorage へ逃がすと『どちらが新しいか』の同期を抱え込む」
 * として、代わりにタブを閉じる直前に確認を出している
 * （UnsavedChangesGuard）。**アプリを閉じるところは掴めない**ので、
 * こちらで同じ手は使えない。そして下書きにはサーバー側の控えが無いので、
 * 「どちらが新しいか」という問い自体が起きない。
 *
 * ■ 形は書き出しと同じものを使う
 * `backup.ts` が既に「作品ぜんたいを1つの JSON にする／読むときに検証する」
 * を持っている。**端末に置いた値は書き換えられる外部入力**なので、
 * 検証の要る場所で新しく書き起こさない。
 */

const DRAFT_KEY = 'choreon.draft.v1';

/** 検証に失敗したときの文言。ここでは画面に出さないので、素の英語で足りる */
const SILENT_WORDS = {
  unreadableFile: 'unreadable',
  wrongShape: 'wrong shape',
  wrongVersion: 'wrong version',
  noProject: 'no project',
  incomplete: 'incomplete',
};

export type GuestDraft = {
  project: Project;
  dancers: Dancer[];
  scenes: Scene[];
  positions: Position[];
};

export async function saveGuestDraft(draft: GuestDraft): Promise<void> {
  const backup = buildBackup({ ...draft, exportedAt: new Date().toISOString() });
  await storage.setItem(DRAFT_KEY, JSON.stringify(backup));
}

/**
 * 残してある下書き。無ければ null。
 *
 * 壊れていたら**捨てて null を返す**。読めない値を持ち続けると、
 * 毎回同じところで転ぶ。
 */
export async function loadGuestDraft(): Promise<GuestDraft | null> {
  const raw = await storage.getItem(DRAFT_KEY);
  if (!raw) return null;

  let backup: Backup;
  try {
    backup = parseBackup(raw, SILENT_WORDS);
  } catch (error) {
    if (error instanceof BackupFormatError) await forgetGuestDraft();
    return null;
  }

  const now = new Date().toISOString();
  // 書き出した形には持ち主も作成日も入っていない（入れても意味が無い）。
  // 下書きの決まった値で組み立て直す
  return {
    project: {
      ...backup.project,
      id: 'local',
      userId: 'local',
      shareToken: null,
      isShared: false,
      createdAt: now,
      updatedAt: now,
    },
    dancers: backup.dancers.map((dancer) => ({
      ...dancer,
      projectId: 'local',
      createdAt: now,
    })),
    scenes: backup.scenes.map((scene) => ({ ...scene, projectId: 'local' })),
    positions: backup.positions,
  };
}

export async function forgetGuestDraft(): Promise<void> {
  await storage.removeItem(DRAFT_KEY);
}
