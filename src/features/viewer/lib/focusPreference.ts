/**
 * 「あなたはどれですか」で選んだポジションを端末に覚えておく。
 *
 * 【端末ごと・作品ごと】。同じリンクを渡された人が同じ端末で開けば
 * 前の選択が残っている、という形にしたい。作品をまたいで同じ人とは
 * 限らないので、作品ごとに別々に持つ。
 *
 * 加えて `?p=<dancerId>` でも指定できる(振付師が個別にリンクを配れる)。
 * クエリが付いていればそちらが勝ち、開いた時点で端末にも覚える。
 *
 * 作法は themePreference / metronomePreference と揃えている。
 * localStorage は書き換えられる外部入力なので、読むときに必ず検証する。
 */

export const VIEWER_FOCUS_STORAGE_KEY = "choreon.viewerFocus.v1";

type Stored = Record<string, string>;

function parseAll(raw: string | null): Stored {
  if (!raw) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (typeof parsed !== "object" || parsed === null) return {};

  const result: Stored = {};
  for (const [projectId, value] of Object.entries(
    parsed as Record<string, unknown>,
  )) {
    if (typeof value === "string" && value !== "") result[projectId] = value;
  }
  return result;
}

export function loadFocusedDancerId(projectId: string): string | null {
  try {
    return parseAll(localStorage.getItem(VIEWER_FOCUS_STORAGE_KEY))[projectId] ?? null;
  } catch {
    return null;
  }
}

export function saveFocusedDancerId(
  projectId: string,
  dancerId: string | null,
): void {
  try {
    const all = parseAll(localStorage.getItem(VIEWER_FOCUS_STORAGE_KEY));
    if (dancerId) all[projectId] = dancerId;
    else delete all[projectId];
    localStorage.setItem(VIEWER_FOCUS_STORAGE_KEY, JSON.stringify(all));
  } catch {
    // 書けなくても今の画面はそのまま動かす(次回に残らないだけ)
  }
}
