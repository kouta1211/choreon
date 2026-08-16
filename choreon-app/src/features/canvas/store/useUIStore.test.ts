import { useUIStore } from './useUIStore';
import { defaultViewPreference } from '@/features/canvas/lib/viewPreference';
import { storage } from '@/lib/storage';

/**
 * 画面の状態（選んでいるもの・見え方・知らせ）。
 *
 * ここで押さえるのは**書き戻しの2つ**。どちらも「画面は動くのに、
 * 次に開くと元へ戻っている」形で出るので、触っている最中には気づけない。
 */
const store = () => useUIStore.getState();

describe('useUIStore', () => {
  beforeEach(() => {
    useUIStore.setState({ ...defaultViewPreference(), selectedSceneId: null, dragSnapLine: { x: null, y: null } });
  });

  describe('見え方の書き戻し', () => {
    it('1つ切り替えても、ほかの項目を既定へ戻さない', async () => {
      // 3つ変えてから、4つ目を切り替える
      store().toggleStageMarks();
      store().toggleBlindSpotCheck();
      store().setGridMode('circle');

      store().togglePathVisible();

      const saved = JSON.parse((await storage.getItem('choreon.view.v1')) ?? '{}');
      // **書き漏らすと、通ったsetterの項目だけが既定へ戻る**（気づきにくい）
      expect(saved).toMatchObject({
        gridMode: 'circle',
        isStageMarksVisible: true,
        isBlindSpotCheckVisible: true,
        isPathVisible: true,
      });
    });

    it('既定へ戻すと、端末の覚えも一緒に戻る', async () => {
      store().toggleStageMarks();

      store().resetViewPreference();

      expect(store().isStageMarksVisible).toBe(false);
      const saved = JSON.parse((await storage.getItem('choreon.view.v1')) ?? '{}');
      expect(saved.isStageMarksVisible).toBe(false);
    });
  });

  describe('選んでいるシーン', () => {
    it('同じシーンを選び直しても、直前のシーンを上書きしない', () => {
      store().selectScene('s1');
      store().selectScene('s2');
      store().selectScene('s2');

      // 上書きすると「前のシーン＝今のシーン」になり、移動の向きが出せなくなる
      expect(store().previousSceneId).toBe('s1');
    });
  });

  describe('吸着線', () => {
    it('同じ値なら、状態を作り直さない（指を動かすたびに描き直させない）', () => {
      const before = store().dragSnapLine;

      store().setDragSnapLine({ x: null, y: null });

      expect(store().dragSnapLine).toBe(before);
    });

    it('変わったときは差し替える', () => {
      store().setDragSnapLine({ x: 5, y: null });

      expect(store().dragSnapLine).toEqual({ x: 5, y: null });
    });
  });
});
