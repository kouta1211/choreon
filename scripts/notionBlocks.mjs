/**
 * 日報の Markdown を Notion のブロックへ変換する（純粋関数）。
 *
 * ここだけ分けてあるのは、**無人で動くものの中で唯一テストできる部分**
 * だから。API 呼び出しは通信が要るが、変換は要らない。
 * 夜中に静かに壊れて、翌朝おかしな日報が1本増える、を防ぐのが目的。
 *
 * 対応するのは日報で実際に使う4つだけ。凝った記法は入れない
 * （入れると、この変換のためのテストが日報より大きくなる）。
 *   ## 見出し / - 箇条書き / 段落 / **太字**
 */

/** バッククォート1文字。この文字自体をリテラルで書くと読みにくいので名前を付ける */
const BT = String.fromCharCode(96);

/**
 * `**太字**` と `` `コード` `` を含む1行を、Notion の rich_text 配列へ。
 *
 * バッククォートを素通しにすると、**Notion 側では記号がそのまま出る**
 * （Markdown として解釈してくれない）。最初それで、日報がバッククォート
 * だらけになった。囲みは自分で外して、annotations に移し替える。
 */
export function richText(line) {
  const parts = [];
  // 太字とコードをまとめて切り出す。捕捉した区切り自体も配列に残る
  for (const chunk of line.split(/(\*\*[^*]+\*\*|`[^`]+`)/)) {
    if (chunk === "") continue;

    /* 太字を先に外してから、残りがコードかを見る。
       この順にしないと `**` + バッククォート`**` の入れ子で、
       バッククォートが文字のまま残る（実際にそれで日報が汚れた） */
    let content = chunk;
    const bold = /^\*\*[^*]+\*\*$/.test(content);
    if (bold) content = content.slice(2, -2);
    const code = new RegExp(`^${BT}[^${BT}]+${BT}$`).test(content);
    if (code) content = content.slice(1, -1);

    parts.push({
      type: "text",
      text: { content },
      annotations: { bold, code },
    });
  }
  return parts;
}

/**
 * Markdown → ブロック配列。
 *
 * 空行は捨てる（Notion は段落の間隔を自分で持つので、空段落を送ると
 * 間延びする）。見出しは h2 まで。日報にそれ以上の階層は要らない。
 */
export function markdownToBlocks(markdown) {
  const blocks = [];
  for (const raw of markdown.split("\n")) {
    const line = raw.trimEnd();
    if (line.trim() === "") continue;

    const heading = line.match(/^##\s+(.*)$/);
    if (heading) {
      blocks.push({
        object: "block",
        type: "heading_2",
        heading_2: { rich_text: richText(heading[1]) },
      });
      continue;
    }

    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (bullet) {
      blocks.push({
        object: "block",
        type: "bulleted_list_item",
        bulleted_list_item: { rich_text: richText(bullet[1]) },
      });
      continue;
    }

    blocks.push({
      object: "block",
      type: "paragraph",
      paragraph: { rich_text: richText(line) },
    });
  }
  return blocks;
}

/** Notion のブロックは1回のリクエストで100個まで。超えたら分けて送る */
export const MAX_BLOCKS_PER_REQUEST = 100;

export function chunkBlocks(blocks, size = MAX_BLOCKS_PER_REQUEST) {
  const out = [];
  for (let i = 0; i < blocks.length; i += size) out.push(blocks.slice(i, i + size));
  return out;
}
