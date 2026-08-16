import {
  DEFAULT_VIEW_PREFERENCE,
  defaultViewPreference,
  parseViewPreference,
} from './viewPreference';

describe('parseViewPreference', () => {
  it('保存されていなければ既定を返す', () => {
    expect(parseViewPreference(null)).toEqual(defaultViewPreference());
  });

  it('保存された選択をそのまま読む', () => {
    const raw = JSON.stringify({
      gridMode: 'circle',
      isPathVisible: true,
      isStageMarksVisible: true,
      isBlindSpotCheckVisible: true,
      isSwipeSceneChangeEnabled: true,
      isMetronomeEnabled: true,
    });

    expect(parseViewPreference(raw)).toEqual({
      gridMode: 'circle',
      isPathVisible: true,
      isStageMarksVisible: true,
      isBlindSpotCheckVisible: true,
      isSwipeSceneChangeEnabled: true,
      isMetronomeEnabled: true,
    });
  });

  it('壊れたJSONでも既定に落として画面を止めない', () => {
    expect(parseViewPreference('{')).toEqual(defaultViewPreference());
  });

  it('知らない目盛りの名前は既定に落とす', () => {
    const raw = JSON.stringify({ gridMode: 'hexagon' });

    expect(parseViewPreference(raw).gridMode).toBe(
      DEFAULT_VIEW_PREFERENCE.gridMode,
    );
  });

  it('真偽値でない値は既定に落とす', () => {
    const raw = JSON.stringify({
      isPathVisible: 'yes',
      isMetronomeEnabled: 'yes',
    });

    expect(parseViewPreference(raw).isPathVisible).toBe(false);
    expect(parseViewPreference(raw).isMetronomeEnabled).toBe(false);
  });

  it('一部だけ保存されていても、残りは既定で埋める', () => {
    const raw = JSON.stringify({ isPathVisible: true });

    expect(parseViewPreference(raw)).toEqual({
      ...defaultViewPreference(),
      isPathVisible: true,
    });
  });
});

describe('defaultViewPreference', () => {
  // iOS/Androidにはmatchmediaが無く常に指なので、web以外は常にオン
  // (jest-expoのPlatform.OSは既定でios)
  it('タッチ端末(iOS/Android)では、払ってのシーン送りを既定でオンにする', () => {
    expect(defaultViewPreference().isSwipeSceneChangeEnabled).toBe(true);
  });

  it('メトロノームは端末ごとの既定でオフ', () => {
    expect(defaultViewPreference().isMetronomeEnabled).toBe(false);
  });
});
