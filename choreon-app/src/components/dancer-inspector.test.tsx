import { act, fireEvent, waitFor } from '@testing-library/react-native';

import { DancerInspector } from './dancer-inspector';
import { renderWithProviders } from '@/test/render';
import { makeDancer, makePosition, makeProject, makeScene } from '@/test/factories';
import { useProjectStore } from '@/features/project/store/useProjectStore';
import { useUIStore } from '@/features/canvas/store/useUIStore';
import { persist } from '@/features/project/lib/persistence';
import { getT } from '@/features/i18n/store/useLocaleStore';

/**
 * 選んでいる人の帯。**保存に失敗したときの戻し方**をここで押さえる。
 *
 * ■ なぜここなのか
 * 「触った → 画面は変わった → でもサーバーには入っていない」が、この
 * アプリでいちばん困る壊れ方。**私の手元では本物の保存を試せない**
 * （ログインできない）ので、保存の窓口を差し替えて確かめる。
 *
 * 差し替えるのは `persist` だけ。**呼び出し側のやり方（先に画面へ出して、
 * 失敗したら戻す）はそのまま**動かしている。
 */
jest.mock('@/features/project/lib/persistence', () => ({
  persist: jest.fn(),
}));

const mockPersist = persist as jest.MockedFunction<typeof persist>;

const DANCER = makeDancer({ id: 'd1', name: 'あかり', color: '#3b82f6' });

function load() {
  useProjectStore.getState().hydrate({
    project: makeProject({ id: 'p1' }),
    dancers: [DANCER],
    scenes: [makeScene({ id: 's1', timeSeconds: 0 }), makeScene({ id: 's2', timeSeconds: 4 })],
    positions: [
      makePosition({ sceneId: 's1', dancerId: 'd1' }),
      makePosition({ sceneId: 's2', dancerId: 'd1', xCoordinate: 6 }),
    ],
    isGuest: false,
  });
  useUIStore.setState({ selectedSceneId: 's1', selectedDancerId: 'd1', toast: null });
}

describe('DancerInspector', () => {
  beforeEach(() => {
    mockPersist.mockReset();
    mockPersist.mockResolvedValue(null);
    load();
  });

  it('誰も選んでいなければ、何も出さない', async () => {
    useUIStore.setState({ selectedDancerId: null });
    const view = await renderWithProviders(<DancerInspector />);

    expect(view.queryByLabelText(getT().dancers.inspector.focus)).toBeNull();
  });

  it('選んでいる人の名前を出す', async () => {
    const view = await renderWithProviders(<DancerInspector />);

    expect(view.getByDisplayValue('あかり')).toBeTruthy();
  });

  it('注目を押すと、その人が注目中になる', async () => {
    const view = await renderWithProviders(<DancerInspector />);

    await fireEvent.press(view.getByLabelText(getT().dancers.inspector.focus));

    expect(useUIStore.getState().focusedDancerId).toBe('d1');
  });

  it('色を変えると、先に画面へ出してから保存する', async () => {
    const view = await renderWithProviders(<DancerInspector />);

    await fireEvent.press(view.getByLabelText('色を #ef4444 にする'));

    // 押した時点でストアはもう新しい色（楽観的更新）
    expect(useProjectStore.getState().dancers.d1.color).toBe('#ef4444');
    await waitFor(() => expect(mockPersist).toHaveBeenCalledTimes(1));
  });

  // **ここがこのファイルの主目的。**
  // 黙って元に戻すのも、戻さずに残すのも、どちらも user を騙すことになる
  it('色の保存に失敗したら、元の色へ戻して知らせる', async () => {
    mockPersist.mockRejectedValue(new Error('offline'));
    const view = await renderWithProviders(<DancerInspector />);

    await fireEvent.press(view.getByLabelText('色を #ef4444 にする'));

    await waitFor(() => expect(useProjectStore.getState().dancers.d1.color).toBe('#3b82f6'));
    expect(useUIStore.getState().toast?.type).toBe('error');
  });

  it('名前の保存に失敗したら、元の名前へ戻して知らせる', async () => {
    mockPersist.mockRejectedValue(new Error('offline'));
    const view = await renderWithProviders(<DancerInspector />);

    const input = view.getByDisplayValue('あかり');
    await fireEvent.changeText(input, 'あかりん');
    await fireEvent(input, 'blur');

    await waitFor(() => expect(useProjectStore.getState().dancers.d1.name).toBe('あかり'));
    expect(useUIStore.getState().toast?.type).toBe('error');
  });

  // 空にして離しても、名前が消えては困る
  it('名前を空にして離したら、元の名前のままにする', async () => {
    const view = await renderWithProviders(<DancerInspector />);

    const input = view.getByDisplayValue('あかり');
    await fireEvent.changeText(input, '   ');
    await fireEvent(input, 'blur');

    await act(async () => {});
    expect(useProjectStore.getState().dancers.d1.name).toBe('あかり');
    expect(mockPersist).not.toHaveBeenCalled();
  });

  it('この人だけの移動時間を入れると、その値で保存する', async () => {
    const view = await renderWithProviders(<DancerInspector />);

    const input = view.getByLabelText('この人だけの移動時間');
    await fireEvent.changeText(input, '1.5');
    await fireEvent(input, 'blur');

    await waitFor(() =>
      expect(
        useProjectStore.getState().positionsBySceneId.s1.d1.dancerTransitionDurationSeconds,
      ).toBe(1.5),
    );
  });

  // 範囲の外は丸める（欄から離れた時に1回だけ）
  it('移動時間が上限を超えたら、上限に丸める', async () => {
    const view = await renderWithProviders(<DancerInspector />);

    const input = view.getByLabelText('この人だけの移動時間');
    await fireEvent.changeText(input, '999');
    await fireEvent(input, 'blur');

    await waitFor(() =>
      expect(
        useProjectStore.getState().positionsBySceneId.s1.d1.dancerTransitionDurationSeconds,
      ).toBe(30),
    );
  });
});
