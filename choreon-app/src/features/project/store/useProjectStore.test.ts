import { useProjectStore } from './useProjectStore';
import { makeDancer, makePosition, makeProject, makeScene } from '@/test/factories';

/**
 * 作品まるごとの置き場。**このアプリでいちばん広く効くストア**で、
 * ここが崩れると画面のどこが壊れたのか追いにくい。
 *
 * 押さえるのは、**消したあとに残骸が残らないこと**と、
 * **時刻を正として並び順が付いてくること**の2つ。どちらも
 * 「画面には出ないが、次の操作から結果が狂う」形で出る。
 */
const store = () => useProjectStore.getState();

function load() {
  store().hydrate({
    project: makeProject({ id: 'p1', title: '本番用' }),
    dancers: [makeDancer({ id: 'd1' }), makeDancer({ id: 'd2' })],
    scenes: [
      makeScene({ id: 's1', name: 'シーン1', timeSeconds: 0 }),
      makeScene({ id: 's2', name: 'シーン2', timeSeconds: 4 }),
      makeScene({ id: 's3', name: 'シーン3', timeSeconds: 8 }),
    ],
    positions: [
      makePosition({ sceneId: 's1', dancerId: 'd1' }),
      makePosition({ sceneId: 's1', dancerId: 'd2' }),
      makePosition({ sceneId: 's2', dancerId: 'd1' }),
    ],
    isGuest: false,
  });
}

describe('useProjectStore', () => {
  beforeEach(load);

  describe('hydrate', () => {
    it('シーンは時刻の順に並べ直す', () => {
      store().hydrate({
        project: makeProject({ id: 'p1' }),
        dancers: [],
        scenes: [
          makeScene({ id: 'late', timeSeconds: 9 }),
          makeScene({ id: 'early', timeSeconds: 1 }),
        ],
        positions: [],
      });

      expect(store().scenes.map((scene) => scene.id)).toEqual(['early', 'late']);
    });

    it('入れ直すと、未保存の印は落ちる（サーバーと一致した状態なので）', () => {
      store().markUnsaved();
      load();

      expect(store().hasUnsavedChanges).toBe(false);
    });
  });

  describe('removeDancer', () => {
    it('その人を、すべてのシーンの立ち位置からも消す', () => {
      store().removeDancer('d1');

      expect(Object.keys(store().dancers)).toEqual(['d2']);
      // **ここが要点**。残しておくと、戻したときに幽霊の位置が復活する
      expect(store().positionsBySceneId.s1?.d1).toBeUndefined();
      expect(store().positionsBySceneId.s2?.d1).toBeUndefined();
      // 巻き添えにしない
      expect(store().positionsBySceneId.s1?.d2).toBeDefined();
    });
  });

  describe('removeScene', () => {
    it('そのシーンの立ち位置ごと消す', () => {
      store().removeScene('s1');

      expect(store().scenes.map((scene) => scene.id)).toEqual(['s2', 's3']);
      expect(store().positionsBySceneId.s1).toBeUndefined();
      expect(store().positionsBySceneId.s2).toBeDefined();
    });
  });

  describe('addScene', () => {
    it('足したシーンも、時刻の位置へ入る（末尾に付けない）', () => {
      store().addScene(makeScene({ id: 'mid', timeSeconds: 2 }));

      expect(store().scenes.map((scene) => scene.id)).toEqual(['s1', 'mid', 's2', 's3']);
    });
  });

  describe('applySceneTimes', () => {
    it('隣を追い越す時刻を入れたら、並び順もその場で入れ替わる', () => {
      // シーン1を 6秒（シーン2の 4秒より後ろ）へ
      store().applySceneTimes(new Map([['s1', 6]]));

      expect(store().scenes.map((scene) => scene.id)).toEqual(['s2', 's1', 's3']);
    });

    it('渡さなかったシーンの時刻は動かさない', () => {
      store().applySceneTimes(new Map([['s2', 5]]));

      const times = Object.fromEntries(
        store().scenes.map((scene) => [scene.id, scene.timeSeconds]),
      );
      expect(times).toEqual({ s1: 0, s2: 5, s3: 8 });
    });
  });

  describe('未保存の印', () => {
    it('markSaved で、下書きではなくなる', () => {
      store().hydrate({
        project: makeProject({ id: 'p1' }),
        dancers: [],
        scenes: [],
        positions: [],
        isGuest: true,
      });
      store().markUnsaved();

      store().markSaved();

      expect(store().isGuest).toBe(false);
      expect(store().hasUnsavedChanges).toBe(false);
    });
  });

  describe('updateDancerPosition', () => {
    it('渡した項目だけを差し替える（部分更新）', () => {
      store().updateDancerPosition('s1', 'd1', { rotationAngle: 90 });

      const position = store().positionsBySceneId.s1.d1;
      expect(position.rotationAngle).toBe(90);
      // 座標は触っていない
      expect(position.xCoordinate).toBe(makePosition({ sceneId: 's1', dancerId: 'd1' }).xCoordinate);
    });
  });
});
