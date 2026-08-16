import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * **ログインしていない相手（anon）が、テーブルを触れてしまわないか**を実測する。
 *
 * ■ なぜ要るか
 * Supabase はプロジェクトを作った時点で、`public` に作られるテーブルへ
 * `anon` を含む3ロールすべてに全権限を配る既定を持っている
 * （`ALTER DEFAULT PRIVILEGES`）。**明示的に GRANT していなくても
 * 付いていることがある**ので、「足りているか」ではなく
 * 「**余計に付いていないか**」を見る必要がある。
 *
 * ■ SQL ではなく実際に叩く
 * `information_schema.role_table_grants` と `pg_policies` は anon の鍵では
 * 読めない。代わりに**本当に読み書きしてみて**、返ってきた答えで判断する。
 * 知りたいのは「付いているか」ではなく「触れてしまうか」なので、
 * こちらの方が答えとしては直接的。
 *
 * ■ 鍵は表に出さない
 * `.env.local` はこのスクリプトが自分で読む。出力するのは表と結果だけで、
 * 鍵も URL も印刷しない。
 *
 * ■ 書き込みは試すが、残さない
 * 通ってしまった場合に備えて、**存在しない id を狙う**。行が無ければ
 * 0件更新で終わるので、user のデータは動かない。
 *
 *   node scripts/check-anon-access.mjs
 */

const here = dirname(fileURLToPath(import.meta.url));

function readEnv() {
  const raw = readFileSync(join(here, '..', '.env.local'), 'utf8');
  const values = {};
  for (const line of raw.split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match) values[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
  return values;
}

const env = readEnv();
const url = env.EXPO_PUBLIC_SUPABASE_URL;
const key = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('.env.local に EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY がありません');
  process.exit(1);
}

const TABLES = ['projects', 'dancers', 'scenes', 'positions'];
/** 存在しない id。ここを狙えば、通っても0件で終わる */
const NOWHERE = '00000000-0000-4000-8000-000000000000';

const headers = { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' };

/** 返ってきた形から「触れたかどうか」を読む */
async function probe(table, method, extra = '') {
  const response = await fetch(`${url}/rest/v1/${table}?${extra}`, {
    method,
    headers: { ...headers, prefer: 'count=exact' },
    ...(method === 'PATCH' ? { body: JSON.stringify({}) } : {}),
    ...(method === 'POST' ? { body: JSON.stringify({}) } : {}),
  });
  const body = await response.text();
  return { status: response.status, body: body.slice(0, 120) };
}

/* まず**鍵が生きているか**を確かめる。無効な鍵でも全部 401 になるので、
   これを見ないと「安全だった」のか「そもそも届いていない」のかが
   区別できない */
const health = await fetch(`${url}/auth/v1/health`, { headers: { apikey: key } });
if (!health.ok) {
  console.error(`鍵が通りません（${health.status}）。この先の結果は当てになりません。`);
  process.exit(1);
}
console.log('鍵は生きています（/auth/v1/health が 200）\n');

console.log('ログインしていない相手（anon）から、実際に叩いた結果\n');

let leaks = 0;

for (const table of TABLES) {
  const read = await probe(table, 'GET', 'select=*&limit=1');
  // 権限が無ければ 401/403。RLS で止めているだけなら 200 で 0件
  const readBlocked = read.status === 401 || read.status === 403;
  const readEmpty = read.status === 200 && (read.body === '[]' || read.body === '');

  const write = await probe(table, 'PATCH', `id=eq.${NOWHERE}`);
  const writeBlocked = write.status === 401 || write.status === 403;

  const readMark = readBlocked ? '拒否' : readEmpty ? '素通り（0件）' : '**読めた**';
  const writeMark = writeBlocked ? '拒否' : '**通った**';

  if (!readBlocked && !readEmpty) leaks += 1;
  if (!writeBlocked) leaks += 1;

  console.log(`${table.padEnd(10)} 読み: ${String(read.status).padEnd(4)} ${readMark}`);
  console.log(`${''.padEnd(10)} 書き: ${String(write.status).padEnd(4)} ${writeMark}`);
}

/* 共有リンクのビューアは、テーブルではなく関数を通る。
   **ここまで閉じてしまうと、配ったリンクが誰にも開けなくなる**ので、
   開いていることを確かめる（開いているのが正しい口） */
const shared = await fetch(`${url}/rest/v1/rpc/shared_project`, {
  method: 'POST',
  headers,
  // 存在しない合鍵。**形は正しいもの**を渡す（形が違うと型の
  // エラーで返り、口が開いているかどうかが読めない）
  body: JSON.stringify({ token: NOWHERE }),
});
const sharedBody = (await shared.text()).slice(0, 80);
console.log('');
console.log(
  `shared_project（共有リンクの読み口）: ${shared.status} ` +
    (shared.status === 200 ? '呼べる（正しい）' : `**呼べない** ${sharedBody}`),
);
if (shared.status === 200) console.log('  → 合鍵が違えば中身は返らない:', sharedBody);

console.log('');
if (leaks === 0) {
  console.log('anon からは何も触れません。');
} else {
  console.log(`anon から触れてしまう口が ${leaks} 件あります。`);
  console.log('個人データのテーブルなので、権限を剥がしてください:');
  console.log('  revoke all on public.<テーブル名> from anon;');
}
console.log('\n※ 200 で 0件（素通り）は、権限は付いているが RLS で止まっている状態です。');
console.log('   ルールどおりにするなら、GRANT の側でも剥がしておくのが安全です。');
