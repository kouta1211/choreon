import { storage } from '@/lib/storage';

/**
 * 「あなたはどれですか」で選んだポジションを端末に覚えておく。
 *
 * 【端末ごと・作品ごと】。同じリンクを渡された人が同じ端末で開けば
 * 前の選択が残っている、という形にしたい。作品をまたいで同じ人とは
 * 限らないので、作品ごとに別々に持つ。
 *
 * 加えて `?p=<dancerId>` でも指定できる（振付師が個別にリンクを配れる）。
 * クエリが付いていればそちらが勝ち、開いた時点で端末にも覚える。
 *
 * ■ Web版との違い
 * あちらは `localStorage` を直に触る同期の関数。ネイティブの AsyncStorage は
 * 非同期なので、**遅い方に合わせて Promise を返す**（settings.ts と同じ判断）。
 * 検証の規則（知らない形は落とす）は1文字も変えていない。
 */

export const VIEWER_FOCUS_STORAGE_KEY = 'choreon.viewerFocus.v1';

type Stored = Record<string, string>;

function parseAll(raw: string | null): Stored {
  if (!raw) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (typeof parsed !== 'object' || parsed === null) return {};

  const result: Stored = {};
  for (const [projectId, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof value === 'string' && value !== '') result[projectId] = value;
  }
  return result;
}

export async function loadFocusedDancerId(projectId: string): Promise<string | null> {
  const all = parseAll(await storage.getItem(VIEWER_FOCUS_STORAGE_KEY));
  return all[projectId] ?? null;
}

export async function saveFocusedDancerId(
  projectId: string,
  dancerId: string | null,
): Promise<void> {
  const all = parseAll(await storage.getItem(VIEWER_FOCUS_STORAGE_KEY));
  if (dancerId) all[projectId] = dancerId;
  else delete all[projectId];
  await storage.setItem(VIEWER_FOCUS_STORAGE_KEY, JSON.stringify(all));
}
