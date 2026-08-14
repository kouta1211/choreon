import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * 端末に覚えておくものの置き場。**Web と iOS/Android の違いをここだけに閉じる。**
 *
 * ■ なぜアダプターが要るのか
 * Web には localStorage があり、React Native には無い。逆に AsyncStorage は
 * Web でも動くが、中身は localStorage の薄い包みで、余計な層を挟むだけになる。
 * 呼ぶ側に `Platform.OS` の分岐を書かせないために、ここで1回だけ分ける。
 *
 * ■ 返り値は【両方とも Promise】に揃える
 * localStorage は同期、AsyncStorage は非同期。速い方に合わせると、
 * ネイティブで書き直しになる。**遅い方に合わせておけば、どちらでも同じ
 * コードが通る。** Web 版(Next.js)の設定まわりが同期で書かれているのは、
 * そちらが localStorage しか相手にしていないため。ここは両方を相手にする。
 *
 * ■ 失敗は飲み込む
 * プライベートモードや容量超過で localStorage は例外を投げる。読めなければ
 * 「覚えていない」、書けなければ「次回に残らない」だけで、いま画面に出て
 * いるものは動き続けるべき。Web 版の themePreference 等と同じ作法。
 */

const isWeb = Platform.OS === 'web';

export const storage = {
  async getItem(key: string): Promise<string | null> {
    try {
      return isWeb ? localStorage.getItem(key) : await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (isWeb) localStorage.setItem(key, value);
      else await AsyncStorage.setItem(key, value);
    } catch {
      // 書けなくても今の画面はそのまま動かす(次回に残らないだけ)
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      if (isWeb) localStorage.removeItem(key);
      else await AsyncStorage.removeItem(key);
    } catch {
      // 同上
    }
  },
};

/** Supabase の `auth.storage` が求める形。中身は上と同じもの */
export type SupportedStorage = typeof storage;
