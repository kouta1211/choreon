/**
 * テストの下ごしらえ。
 *
 * AsyncStorage は本物を読むとネイティブ側の実体を要求して落ちるので、
 * 公式が同梱している偽物へ差し替える(中身はメモリ上の Map)。
 * これで「Web は localStorage / ネイティブは AsyncStorage」の分岐を、
 * どちらの側からも試せるようになる。
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

/**
 * Supabase クライアントは、読み込んだ時点で環境変数を見て、無ければ投げる。
 * ロジックのテストに実際の接続先は要らないので、形だけ渡しておく。
 */
process.env.EXPO_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??= 'test-anon-key';
