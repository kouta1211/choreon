import { act, renderHook } from '@testing-library/react-native';

// RNTL v14 は render も renderHook も **Promise を返す**（await を忘れると
// result が undefined のまま返ってくる）

import { useAddScene } from './useAddScene';
import { makeDancer, makePosition, makeProject, makeScene } from '@/test/factories';
import { useProjectStore } from '@/features/project/store/useProjectStore';
import { useUIStore } from '@/features/canvas/store/useUIStore';
import { useSettingsStore } from '@/features/settings/store/useSettingsStore';
import { persist } from '@/features/project/lib/persistence';
import { getT } from '@/features/i18n/store/useLocaleStore';

/**
 * シーンを足す。帯（狭い画面）と一覧（広い画面）の両方から呼ばれる。
 *
 * ■ 押さえたいこと
 *   1. **いまの配置をコピーする**（毎回ゼロから置き直させない）
 *   2. **失敗したら画面からも消す** — 画面にあるのにサーバーに無いシーンは、
 *      次に開いたときに黙って消えて見える。いちばん困る壊れ方
 */
jest.mock('@/features/project/lib/persistence', () => ({
  persist: jest.fn(),
}));

const mockPersist = persist as jest.MockedFunction<typeof persist>;

function load() {
  useProjectStore.getState().hydrate({
    project: makeProject({ id: 'p1' }),
    dancers: [makeDancer({ id: 'd1' }), makeDancer({ id: 'd2' })],
    scenes: [
      makeScene({ id: 's1', timeSeconds: 0 }),
      makeScene({ id: 's2', timeSeconds: 4 }),
    ],
    positions: [
      makePosition({ sceneId: 's1', dancerId: 'd1', xCoordinate: 3, yCoordinate: 7 }),
      makePosition({ sceneId: 's1', dancerId: 'd2', xCoordinate: 9, yCoordinate: 2 }),
    ],
    isGuest: false,
  });
  useUIStore.setState({ selectedSceneId: 's1', toast: null });
  useSettingsStore.setState({ defaultSegmentSeconds: 4 });
}

describe('useAddScene', () => {
  beforeEach(() => {
    mockPersist.mockReset();
    mockPersist.mockResolvedValue(null);
    load();
  });

  it('選んでいるシーンの配置をコピーして足す', async () => {
    const { result } = await renderHook(() => useAddScene());

    await act(async () => {
      await result.current();
    });

    const state = useProjectStore.getState();
    expect(state.scenes).toHaveLength(3);

    // 足したシーンが選ばれている
    const addedId = useUIStore.getState().selectedSceneId!;
    expect(['s1', 's2']).not.toContain(addedId);

    // 中身は元と同じ
    const copied = state.positionsBySceneId[addedId];
    expect(copied.d1.xCoordinate).toBe(3);
    expect(copied.d1.yCoordinate).toBe(7);
    expect(copied.d2.xCoordinate).toBe(9);
  });

  it('足す先は、選んでいるシーンの隣（末尾ではない）', async () => {
    const { result } = await renderHook(() => useAddScene());

    await act(async () => {
      await result.current();
    });

    const ids = useProjectStore.getState().scenes.map((scene) => scene.id);
    // s1 と s2 のあいだへ入る
    expect(ids[0]).toBe('s1');
    expect(ids[2]).toBe('s2');
  });

  it('保存に失敗したら、画面からも消して知らせる', async () => {
    mockPersist.mockRejectedValue(new Error('offline'));
    const { result } = await renderHook(() => useAddScene());

    await act(async () => {
      await result.current();
    });

    const state = useProjectStore.getState();
    expect(state.scenes.map((scene) => scene.id)).toEqual(['s1', 's2']);
    // 選び直しも元へ戻す
    expect(useUIStore.getState().selectedSceneId).toBe('s1');
    expect(useUIStore.getState().toast?.message).toBe(getT().scenes.addFailed);
  });

  it('シーンが1つも無ければ、何もしない', async () => {
    useProjectStore.getState().hydrate({
      project: makeProject({ id: 'p1' }),
      dancers: [],
      scenes: [],
      positions: [],
    });
    const { result } = await renderHook(() => useAddScene());

    await act(async () => {
      await result.current();
    });

    expect(useProjectStore.getState().scenes).toEqual([]);
    expect(mockPersist).not.toHaveBeenCalled();
  });
});
