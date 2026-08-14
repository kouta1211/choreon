// React Native の URL は仕様の一部しか実装していない。Supabase は内部で
// URL を組み立てるので、これを先に読ませないと実機で落ちる（Web では無害）
import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { storage } from '@/lib/storage';

/**
 * ネイティブ版の Supabase クライアント。
 *
 * ■ Web版のコピーではない
 * Web版(ルートの Next.js)は `@supabase/ssr` の `createBrowserClient` を使う。
 * あれは **Cookie にセッションを置いて、サーバー側（Server Component や
 * middleware）と同じセッションを共有する**ための仕組み。ネイティブには
 * Cookie もサーバーも無いので、素の `createClient` に、この端末の
 * ストレージ（storage.ts）を渡す形になる。
 *
 * ■ detectSessionInUrl を切る
 * Web では、メールのリンクから戻ってきたときに URL のハッシュから
 * セッションを拾う。ネイティブに URL バーは無く、戻り先はディープリンク
 * (scheme: choreonapp) なので、そちらは別途 expo-linking で扱う。
 * 切らないと、起動のたびに存在しない URL を見にいく。
 */

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // ここで落とすのは、後段の「なぜか401」より原因が読めるため
  throw new Error(
    'EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY が設定されていません。choreon-app/.env.local を確認してください',
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    storage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

/**
 * アプリが前面にある間だけ、トークンの自動更新を回す。
 *
 * 背面のまま更新を回し続けると、OS に止められた状態で失敗が積もる。
 * 前面に戻った時点で1回走らせれば、期限切れは追いつく。
 * (Web にはこの概念が無いので、タブの表示状態はブラウザに任せる)
 */
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
