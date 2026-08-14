import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { storage } from './storage';

/**
 * ストレージのアダプター。**ネイティブ版でいちばん下にある土台**で、
 * ここが壊れると設定も表示の選択も静かに消える。
 *
 * jest-expo の既定は「ネイティブとして走る」ので、ここで確かめているのは
 * **AsyncStorage 側の道**。Web 側(localStorage)の分岐は下の describe で、
 * Platform.OS を差し替えて確かめる。
 */
describe('storage（ネイティブ側 = AsyncStorage）', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it('書いたものが読める', async () => {
    await storage.setItem('key', 'value');
    await expect(storage.getItem('key')).resolves.toBe('value');
  });

  it('知らないキーは null', async () => {
    await expect(storage.getItem('unknown')).resolves.toBeNull();
  });

  it('消せる', async () => {
    await storage.setItem('key', 'value');
    await storage.removeItem('key');
    await expect(storage.getItem('key')).resolves.toBeNull();
  });

  it('AsyncStorage を使っている（localStorage ではない）', async () => {
    await storage.setItem('key', 'value');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('key', 'value');
  });

  // 端末が一杯・壊れている等。読めなければ「覚えていない」、書けなければ
  // 「次回に残らない」だけで、いま出ている画面は動き続けるべき
  it('読めなくても投げず、null を返す', async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('boom'));
    await expect(storage.getItem('key')).resolves.toBeNull();
  });

  it('書けなくても投げない', async () => {
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('boom'));
    await expect(storage.setItem('key', 'value')).resolves.toBeUndefined();
  });
});

describe('storage（Web 側 = localStorage）', () => {
  /**
   * `storage.ts` は読み込んだ時点で Platform.OS を見て道を決める。
   * そこで **モジュールを作り直してから** Platform を差し替える —
   * jest.resetModules() は react-native も作り直すので、先に差し替えた
   * ものは別インスタンスになって効かない。
   */
  function loadWebStorage(localStorageImpl: object) {
    jest.resetModules();
    const reactNative = require('react-native') as typeof import('react-native');
    Object.defineProperty(reactNative.Platform, 'OS', {
      value: 'web',
      configurable: true,
    });
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageImpl,
      configurable: true,
    });
    return (require('./storage') as typeof import('./storage')).storage;
  }

  it('localStorage を使う（AsyncStorage は呼ばれない）', async () => {
    const store: Record<string, string> = {};
    const webStorage = loadWebStorage({
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
    });

    await webStorage.setItem('key', 'value');

    expect(store.key).toBe('value');
    await expect(webStorage.getItem('key')).resolves.toBe('value');
    await webStorage.removeItem('key');
    expect(store.key).toBeUndefined();
  });

  // プライベートモードの Safari は setItem で例外を投げる
  it('localStorage が投げても飲み込む', async () => {
    const webStorage = loadWebStorage({
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('denied');
      },
      removeItem: () => {
        throw new Error('denied');
      },
    });

    await expect(webStorage.getItem('key')).resolves.toBeNull();
    await expect(webStorage.setItem('key', 'value')).resolves.toBeUndefined();
    await expect(webStorage.removeItem('key')).resolves.toBeUndefined();
  });
});
