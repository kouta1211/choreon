/**
 * 共有リンクの組み立て。
 *
 * ■ なぜ純関数に切り出すのか
 * リンクは「配ったら取り消せないもの」なので、形を間違えたことに
 * 気づくのが常に手遅れになる(相手の手元に残る)。組み立てだけを
 * 切り出してテストで固定しておく。
 *
 * ■ 何を含めるか
 * - 作品のid … どの作品か
 * - t=トークン … 開いてよい人かどうか。これが合鍵
 * - p=ダンサーid … 開いた時点で「自分」が選ばれている(任意)
 *
 * 個別リンク(p付き)は、振付師が一人ひとりに違うリンクを配るためのもの。
 * ポジションを選ぶ手間が省けるだけで、**権限の細かさではない**
 * (pを書き換えれば他の人の道順も見られる)。
 */

export type ShareLinkInput = {
  /** アプリの入口。`https://choreon.example` のような、末尾スラッシュ無し */
  origin: string;
  projectId: string;
  shareToken: string;
  /** 開いた時点で選ばれるポジション。省略すると入口で選ばせる */
  dancerId?: string | null;
};

export function buildShareLink({
  origin,
  projectId,
  shareToken,
  dancerId,
}: ShareLinkInput): string {
  // 末尾のスラッシュを落としてから繋ぐ。二重スラッシュのURLは
  // 見た目が壊れているように読めて、貼る側が不安になる
  const base = origin.replace(/\/+$/, "");
  const query = new URLSearchParams({ t: shareToken });
  if (dancerId) query.set("p", dancerId);

  return `${base}/view/${projectId}?${query.toString()}`;
}

/**
 * リンクを実際にコピーする。
 *
 * navigator.clipboard は https でないと使えず、iOS では
 * 「利用者の操作の中で呼ぶ」ことも要る。使えないときは選択して
 * コピーしてもらう昔ながらの手に落とす — ここで失敗すると
 * 「押したのに何も起きない」になり、リンクを配れない
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // 権限が無い・安全なコンテキストでない。下の手に落とす
  }

  try {
    const area = document.createElement("textarea");
    area.value = text;
    // 画面の外へ出しつつ、フォーカスは当てられる位置に置く
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "-1000px";
    document.body.appendChild(area);
    area.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(area);
    return copied;
  } catch {
    return false;
  }
}
