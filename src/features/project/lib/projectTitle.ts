/**
 * 作品の名前がぶつからないようにする。
 *
 * 同じ名前の作品が並ぶと、一覧でもチェックリストでも「どっちが今日の方か」が
 * 見分けられない。作るときだけ面倒を見て、既にある名前なら末尾に (2)、(3) …
 * と番号を足す。
 *
 * ■ 名前を変えるのは【ぶつかったときだけ】
 * 「発表会 (2)」と自分で名付けるのは自由で、ぶつかっていなければそのまま通す。
 * 打った名前と違うものが黙って保存される場面を、必要な1つに絞る。
 *
 * ■ 改名(一覧のタイトル変更)では使わない
 * 打っている途中に (2) が生えると、狙って同じ名前を付けようとしている手を
 * 邪魔する。ここを通るのは「新しく作る」経路だけ。
 */

/** 末尾の " (数字)"。番号を足すときは、この部分を幹から外してから数え直す */
const NUMBERED_SUFFIX = /\s*\((\d+)\)$/;

export function nextAvailableTitle(
  existing: string[],
  desired: string,
): string {
  const taken = new Set(existing.map((title) => title.trim()));
  const wanted = desired.trim();

  if (!taken.has(wanted)) return wanted;

  // 「発表会 (2)」がぶつかったら「発表会 (3)」を探す。
  // 「発表会 (2) (2)」と積み上げない
  const base = wanted.replace(NUMBERED_SUFFIX, "").trim() || wanted;

  // 空いている番号は、既にある数より必ず手前で見つかる
  // (n個の名前が塞げるのは n通りまで)。念のため上限を置いて回し切る
  for (let n = 2; n <= taken.size + 2; n += 1) {
    const candidate = `${base} (${n})`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base} (${taken.size + 2})`;
}
