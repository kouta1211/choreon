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
 * トークンの形をしていないものを落とす。**Web版 sharedProject.ts からの写し。**
 *
 * ネイティブ版はまだビューア（共有されたものを開く側）を持たないが、
 * こちらで作ったトークンが uuid の形かどうかは確かめられる。
 * 形が違うものを配ると、開いた相手の画面で Postgres の型変換が例外になる。
 */
export function isShareToken(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}
