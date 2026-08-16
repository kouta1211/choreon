import { act, renderHook } from '@testing-library/react-native';

import { useHistoryActions } from './useHistoryActions';
import { useHistoryStore } from '@/features/canvas/store/useHistoryStore';
import { useProjectStore } from '@/features/project/store/useProjectStore';
import { useUIStore } from '@/features/canvas/store/useUIStore';
import { persist } from '@/features/project/lib/persistence';
import { makeDancer, makePosition, makeProject, makeScene } from '@/test/factories';
import { getT } from '@/features/i18n/store/useLocaleStore';

/**
 * 元に戻す／やり直す。
 *
 * ■ なぜここを試すのか
 * ここは長らく**画面だけ**を書き換えていた。移動は保存されるのに戻したことは
 * 保存されないので、**間違えて動かしたものを元に戻して、直ったように見えた
 * まま、間違った位置の方がサーバーに残る**。次に開いたときに戻っていて、
 * そのときには履歴も消えている。動かしている最中には絶対に気づけない。
 */
jest.mock('@/features/project/lib/persistence', () => ({
  persist: jest.fn(),
}));

const mockPersist = persist as jest.MockedFunction<typeof persist>;

const CHANGE = {
  sceneId: 's1',
  dancerId: 'd1',
  before: makePosition({ sceneId: 's1', dancerId: 'd1', xCoordinate: 2, yCoordinate: 5 }),
  after: makePosition({ sceneId: 's1', dancerId: 'd1', xCoordinate: 9, yCoordinate: 5 }),
};

function load() {
  useProjectStore.getState().hydrate({
    project: makeProject({ id: 'p1' }),
    dancers: [makeDancer({ id: 'd1' })],
    scenes: [makeScene({ id: 's1', timeSeconds: 0 })],
    positions: [makePosition({ sceneId: 's1', dancerId: 'd1', xCoordinate: 9, yCoordinate: 5 })],
    isGuest: false,
  });
  useUIStore.setState({ selectedSceneId: 's1', toast: null, isPlaying: false });
  useHistoryStore.setState({ past: [], future: [] });
  useHistoryStore.getState().push({ kind: 'move', changes: [CHANGE] });
}

const positionOf = () => useProjectStore.getState().positionsBySceneId.s1.d1;

describe('useHistoryActions', () => {
  beforeEach(() => {
    mockPersist.mockReset();
    mockPersist.mockResolvedValue(null);
    load();
  });

  it('戻すと、画面も【保存も】前の位置になる', async () => {
    const { result } = await renderHook(() => useHistoryActions());

    await act(async () => {
      await result.current.undo();
    });

    expect(positionOf().xCoordinate).toBe(2);
    // **ここが要点**。画面だけ戻しても、次に開くと戻っていない
    expect(mockPersist).toHaveBeenCalledTimes(1);
  });

  it('やり直すと、動かしたあとの位置へ戻る', async () => {
    const { result } = await renderHook(() => useHistoryActions());
    await act(async () => {
      await result.current.undo();
    });

    await act(async () => {
      await result.current.redo();
    });

    expect(positionOf().xCoordinate).toBe(9);
  });

  it('保存に失敗したら、画面も履歴も動かす前へ戻す', async () => {
    mockPersist.mockRejectedValue(new Error('offline'));
    const { result } = await renderHook(() => useHistoryActions());

    await act(async () => {
      await result.current.undo();
    });

    // 位置はそのまま
    expect(positionOf().xCoordinate).toBe(9);
    // 履歴も戻す。ここを忘れると、画面は元の位置なのに履歴だけ1つずれる
    expect(useHistoryStore.getState().past).toHaveLength(1);
    expect(useHistoryStore.getState().future).toHaveLength(0);
    expect(useUIStore.getState().toast?.message).toBe(getT().history.undoFailed);
  });

  it('戻す相手が消えていたら、書き戻さずに知らせる', async () => {
    // ダンサーを消してから戻す
    useProjectStore.getState().removeDancer('d1');
    const { result } = await renderHook(() => useHistoryActions());

    await act(async () => {
      await result.current.undo();
    });

    expect(mockPersist).not.toHaveBeenCalled();
    expect(useUIStore.getState().toast?.message).toBe(getT().history.targetGone);
  });

  it('再生中に押したら、まず止める', async () => {
    useUIStore.setState({ isPlaying: true });
    const { result } = await renderHook(() => useHistoryActions());

    await act(async () => {
      await result.current.undo();
    });

    expect(useUIStore.getState().isPlaying).toBe(false);
  });
});
