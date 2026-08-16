import { saveGuestDraft, loadGuestDraft, forgetGuestDraft } from './guestDraft';
import { makeDancer, makePosition, makeProject, makeScene } from '@/test/factories';
import { storage } from '@/lib/storage';

/**
 * ログインせずに作った下書きを、端末に残す。
 *
 * ■ なぜテストするのか
 * 壊れても**その場では何も起きない**。次にアプリを開いたときに、
 * 組んだ隊形がサンプルへ戻っているという形でしか出ない。しかも
 * そのときには手元にもう何も残っていない。
 */
const DRAFT = {
  project: makeProject({ id: 'local', title: '春の発表会', stageWidth: 12, stageHeight: 8 }),
  dancers: [makeDancer({ id: 'd1', name: 'あかり' }), makeDancer({ id: 'd2' })],
  scenes: [makeScene({ id: 's1', timeSeconds: 0 }), makeScene({ id: 's2', timeSeconds: 4 })],
  positions: [
    makePosition({ sceneId: 's1', dancerId: 'd1', xCoordinate: 3, yCoordinate: 7 }),
    makePosition({ sceneId: 's2', dancerId: 'd1', xCoordinate: 9, yCoordinate: 2 }),
  ],
};

describe('下書きを端末に残す', () => {
  beforeEach(async () => {
    await forgetGuestDraft();
  });

  it('残していなければ null', async () => {
    expect(await loadGuestDraft()).toBeNull();
  });

  it('書いたものが、そのまま戻る', async () => {
    await saveGuestDraft(DRAFT);

    const back = await loadGuestDraft();
    expect(back?.project.title).toBe('春の発表会');
    expect(back?.project.stageWidth).toBe(12);
    expect(back?.dancers.map((d) => d.name)).toEqual(['あかり', 'あいり']);
    expect(back?.scenes.map((s) => s.timeSeconds)).toEqual([0, 4]);
    expect(back?.positions).toHaveLength(2);
    // 立ち位置は座標まで戻る（ここが抜けると、隊形だけが失われる）
    const first = back?.positions.find((p) => p.sceneId === 's1' && p.dancerId === 'd1');
    expect(first?.xCoordinate).toBe(3);
    expect(first?.yCoordinate).toBe(7);
  });

  it('下書きの決まった値は、読むときに付け直す', async () => {
    await saveGuestDraft(DRAFT);

    const back = await loadGuestDraft();
    // 持ち主も共有も、下書きには無い
    expect(back?.project.id).toBe('local');
    expect(back?.project.userId).toBe('local');
    expect(back?.project.shareToken).toBeNull();
    expect(back?.project.isShared).toBe(false);
    expect(back?.dancers.every((d) => d.projectId === 'local')).toBe(true);
    expect(back?.scenes.every((s) => s.projectId === 'local')).toBe(true);
  });

  it('壊れていたら捨てて、null を返す（毎回同じ所で転ばせない）', async () => {
    await storage.setItem('choreon.draft.v1', '{ これは JSON ではない');

    expect(await loadGuestDraft()).toBeNull();
    // 捨ててある
    expect(await storage.getItem('choreon.draft.v1')).toBeNull();
  });

  it('形が違うものも捨てる', async () => {
    await storage.setItem('choreon.draft.v1', JSON.stringify({ version: 1 }));

    expect(await loadGuestDraft()).toBeNull();
  });

  it('忘れさせると、次からは null', async () => {
    await saveGuestDraft(DRAFT);

    await forgetGuestDraft();

    expect(await loadGuestDraft()).toBeNull();
  });
});
