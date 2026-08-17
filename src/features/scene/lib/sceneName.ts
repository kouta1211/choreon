import type { Scene } from "@/features/scene/types";

/**
 * 新しいシーンに付ける名前を決める。
 *
 * ■ 「〜のコピー」をやめた(2026-08-17)
 * 複製すると `シーン3 のコピー`、それをまた複製すると
 * `シーン3 のコピー のコピー` と伸びていた。**通し番号で揃える**という
 * 指摘を受けて、追加も複製も同じ規則にしてある。
 *
 * ■ 「まだ使われていない、いちばん小さい番号」
 * 件数＋1 ではない。3つ作って真ん中を消すと、件数＋1 は既にある
 * `シーン3` とぶつかる。名前が同じシーンが2つ並ぶと、一覧でも
 * 時間軸でも見分けが付かない。
 *
 * 名前を手で変えている人（`本番前` `サビ` など）の名前は数に入らないので、
 * その場合は `シーン1` から順に埋まっていく。これは指摘のとおりの動き:
 * 「過去のシーンの名称を変更していて シーン(通し番号) が無いなら、
 * 新しく追加したシーンの名称は シーン(通し番号) にすればよい」。
 *
 * @param sceneName 番号から名前を作る関数(`t.projects.sceneName`)。
 *                  言語ごとに語が違うので、辞書から渡してもらう
 */
export function nextSceneName(
  scenes: Scene[],
  sceneName: (index: number) => string,
): string {
  const taken = new Set(scenes.map((scene) => scene.name));
  for (let index = 1; index <= scenes.length + 1; index += 1) {
    const candidate = sceneName(index);
    if (!taken.has(candidate)) return candidate;
  }
  // ここへは来ない(件数＋1 個の候補のうち、埋まるのは高々件数個)。
  // 念のため、通し番号の続きを返して名前を空にしない
  return sceneName(scenes.length + 1);
}
