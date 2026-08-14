import AsyncStorage from '@react-native-async-storage/async-storage';

import { useSettingsStore } from './useSettingsStore';
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from '@/features/settings/lib/settings';

/**
 * 設定のストア。**Web版との違いは「読み書きが非同期になったこと」だけ**なので、
 * ここで確かめるのはその一点に集中している。
 */
describe('useSettingsStore', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useSettingsStore.setState({ ...DEFAULT_SETTINGS, isLoaded: false });
  });

  it('読み込む前は既定値が入っていて、isLoaded は false', () => {
    const state = useSettingsStore.getState();
    expect(state.isLoaded).toBe(false);
    expect(state.defaultBpm).toBe(DEFAULT_SETTINGS.defaultBpm);
  });

  it('端末に置いてある値を読み込む', async () => {
    await AsyncStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ ...DEFAULT_SETTINGS, defaultBpm: 100 }),
    );

    await useSettingsStore.getState().load();

    expect(useSettingsStore.getState().defaultBpm).toBe(100);
    expect(useSettingsStore.getState().isLoaded).toBe(true);
  });

  it('変えたその場で端末へ書く', async () => {
    useSettingsStore.getState().update('defaultBpm', 140);

    // 書き込みの完了は待たない作りなので、ここで一度手を離す
    await Promise.resolve();
    const raw = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);

    expect(JSON.parse(raw ?? '{}').defaultBpm).toBe(140);
    // 関数と isLoaded は端末に置かない
    expect(JSON.parse(raw ?? '{}')).not.toHaveProperty('isLoaded');
    expect(JSON.parse(raw ?? '{}')).not.toHaveProperty('update');
  });

  it('既定へ戻すと、端末の値も既定になる', async () => {
    useSettingsStore.getState().update('defaultBpm', 140);
    useSettingsStore.getState().reset();
    await Promise.resolve();

    expect(useSettingsStore.getState().defaultBpm).toBe(DEFAULT_SETTINGS.defaultBpm);
    const raw = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
    expect(JSON.parse(raw ?? '{}').defaultBpm).toBe(DEFAULT_SETTINGS.defaultBpm);
  });

  it('2回目の load は何もしない（読み込み済みなら端末を見に行かない）', async () => {
    await useSettingsStore.getState().load();
    await AsyncStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ ...DEFAULT_SETTINGS, defaultBpm: 200 }),
    );

    await useSettingsStore.getState().load();

    expect(useSettingsStore.getState().defaultBpm).toBe(DEFAULT_SETTINGS.defaultBpm);
  });

  /**
   * 非同期にしたことで生まれた隙間。**Web版(同期)には存在しない**。
   * 端末から読んでいる最中に user がトグルを触ったら、読み終えた古い値で
   * 上書きしてはいけない。
   */
  it('読み込み中に触られた値を、古い値で上書きしない', async () => {
    await AsyncStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ ...DEFAULT_SETTINGS, isAudienceOnTop: false }),
    );

    const loading = useSettingsStore.getState().load();
    // 読んでいる間に触った、という状況を作る
    useSettingsStore.setState({ isAudienceOnTop: true, isLoaded: true });
    await loading;

    expect(useSettingsStore.getState().isAudienceOnTop).toBe(true);
  });

  // 端末に置いた値は書き換えられる外部入力。知らない値は既定へ落とす
  it('壊れた値が入っていても既定で立ち上がる', async () => {
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, '{壊れている');

    await useSettingsStore.getState().load();

    expect(useSettingsStore.getState().defaultBpm).toBe(DEFAULT_SETTINGS.defaultBpm);
    expect(useSettingsStore.getState().isLoaded).toBe(true);
  });
});
