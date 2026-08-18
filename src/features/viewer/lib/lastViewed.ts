/**
 * 最後に見た共有リンクを、この端末に覚えておく。
 *
 * ■ なぜ要るか(2026-08-18、実機の報告 05-5)
 * ホーム画面に置いたアイコンは、マニフェストの `start_url` どおり
 * **トップページを開く**。共有リンクではない。そのため圏外でアイコンから
 * 開くと、控えてあるトップページ（「ゲストで始める」の画面）が出るだけで、
 * **さっきまで見ていた振付へ戻る道が無い**。
 *
 * 見る人はアカウントを持っていないので、サーバー側に「最後に見たもの」を
 * 置く先が無い。端末に覚えるのがいちばん素直。
 *
 * ■ 中身は「開き方」だけ
 * 振付そのものは控えない。ページ自体はサービスワーカーが控えていて
 * (public/sw.js)、同じURLを開けば圏外でも出る。ここが持つのは
 * **どのURLだったか**と、人が見分けるための題名だけ。
 */

const KEY = "choreon.lastViewed.v1";

export type LastViewed = {
  /** `/view/<id>?t=<token>` の形。この端末で開けた実績のあるものだけ入る */
  path: string;
  /** 一覧で見分けるための題名 */
  title: string;
};

/** localStorage は書き換えられる外部入力。読むときに必ず検証する。
 * **`/view/` で始まる相対パス以外は受け付けない** — ここを緩めると、
 * 書き換えられた値でよそのURLへ飛ばす入口になる */
export function parseLastViewed(raw: string | null): LastViewed | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return null;
    const record = value as Record<string, unknown>;
    const path = record.path;
    const title = record.title;
    if (typeof path !== "string" || typeof title !== "string") return null;
    if (!path.startsWith("/view/")) return null;
    // `//evil.example` のような、別のホストへ行く書き方を弾く
    if (path.startsWith("//")) return null;
    return { path, title };
  } catch {
    return null;
  }
}

export function loadLastViewed(): LastViewed | null {
  if (typeof window === "undefined") return null;
  try {
    return parseLastViewed(localStorage.getItem(KEY));
  } catch {
    return null;
  }
}

export function saveLastViewed(entry: LastViewed): void {
  if (typeof window === "undefined") return;
  if (!entry.path.startsWith("/view/") || entry.path.startsWith("//")) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(entry));
  } catch {
    // 容量が一杯・プライベートモードなど。覚えられなくても本体は動く
  }
}

/** 共有が止まったリンクを覚えたままにしない */
export function clearLastViewed(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    // 消せなくても実害は無い
  }
}

export const LAST_VIEWED_STORAGE_KEY = KEY;

/* useSyncExternalStore へ渡す2つ。**生の文字列のまま返す**のが要 —
   ここで parse したものを返すと毎回新しいオブジェクトになり、
   React が「変わった」と見て描き直し続ける（無限ループ）。
   読み解くのは受け取った側で1回だけ */
export function subscribeLastViewed(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  // 別のタブで見た分も拾う
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

export function readLastViewedRaw(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/** サーバー側には端末の記憶が無い */
export function readLastViewedServer(): null {
  return null;
}

