import {
  clampBeatsPerBar,
  clampBpm,
  clampMusicOffset,
  DEFAULT_BEATS_PER_BAR,
  DEFAULT_BPM,
  MAX_BPM,
  MAX_MUSIC_OFFSET_SECONDS,
  MIN_BPM,
} from './bpmRange';

describe('clampBpm', () => {
  it('範囲の中はそのまま', () => {
    expect(clampBpm(128)).toBe(128);
  });

  it('端を超えたら端で止める', () => {
    expect(clampBpm(10)).toBe(MIN_BPM);
    expect(clampBpm(1000)).toBe(MAX_BPM);
  });

  it('小数は丸める（BPM に小数は要らない）', () => {
    expect(clampBpm(127.4)).toBe(127);
    expect(clampBpm(127.6)).toBe(128);
  });

  it('数でないものは既定に落とす（欄を空にしたとき）', () => {
    expect(clampBpm(Number.NaN)).toBe(DEFAULT_BPM);
    expect(clampBpm(Number.POSITIVE_INFINITY)).toBe(DEFAULT_BPM);
  });
});

describe('clampBeatsPerBar', () => {
  it('選べる値はそのまま', () => {
    expect(clampBeatsPerBar(3)).toBe(3);
    expect(clampBeatsPerBar(6)).toBe(6);
  });

  it('DB の制約（2〜12）の外は端で止める', () => {
    expect(clampBeatsPerBar(1)).toBe(2);
    expect(clampBeatsPerBar(16)).toBe(12);
  });

  it('数でないものは既定に落とす', () => {
    expect(clampBeatsPerBar(Number.NaN)).toBe(DEFAULT_BEATS_PER_BAR);
  });
});

describe('clampMusicOffset', () => {
  it('0.1秒まで。それより細かい桁は落とす', () => {
    expect(clampMusicOffset(12.54)).toBe(12.5);
    expect(clampMusicOffset(12.56)).toBe(12.6);
  });

  it('マイナスは 0（曲より前からは始められない）', () => {
    expect(clampMusicOffset(-5)).toBe(0);
  });

  it('打ち間違えた大きな桁は1時間で止める', () => {
    expect(clampMusicOffset(125000)).toBe(MAX_MUSIC_OFFSET_SECONDS);
  });

  it('数でないものは 0（曲の頭から）', () => {
    expect(clampMusicOffset(Number.NaN)).toBe(0);
  });
});
