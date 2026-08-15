import { act, fireEvent, waitFor } from '@testing-library/react-native';

import { SongSettings } from './song-settings';
import { renderWithProviders } from '@/test/render';
import { makeProject } from '@/test/factories';
import { useProjectStore } from '@/features/project/store/useProjectStore';
import { useUIStore } from '@/features/canvas/store/useUIStore';
import { persist } from '@/features/project/lib/persistence';
import { getT } from '@/features/i18n/store/useLocaleStore';

/**
 * 曲に合わせる（速さ・拍子・曲の開始位置）。
 *
 * ■ ここで押さえたいこと
 * この3つは**作品の列**で、メトロノームと予備拍が読んでいる。これまで
 * 変える場所が無く、作った時の値のまま動かせなかった。だから
 * 「押した値がちゃんと作品に入るか」と、「保存に失敗したら元へ戻るか」
 * （画面だけ新しい値のまま残ると、次に開いたときに黙って戻る）を見る。
 */
jest.mock('@/features/project/lib/persistence', () => ({
  persist: jest.fn(),
}));

const mockPersist = persist as jest.MockedFunction<typeof persist>;

function load() {
  useProjectStore.getState().hydrate({
    project: makeProject({ id: 'p1', bpm: 120, beatsPerBar: 4, musicOffsetSeconds: 0 }),
    dancers: [],
    scenes: [],
    positions: [],
    isGuest: false,
  });
  useUIStore.setState({ toast: null });
}

describe('SongSettings', () => {
  const t = getT();

  beforeEach(() => {
    mockPersist.mockReset();
    mockPersist.mockResolvedValue(null);
    load();
  });

  it('作品を開いていなければ、何も出さない', async () => {
    useProjectStore.setState({ project: null });
    const view = await renderWithProviders(<SongSettings />);

    expect(view.queryByText(t.song.bpm)).toBeNull();
  });

  it('プリセットを押すと、作品の速さが変わる', async () => {
    const view = await renderWithProviders(<SongSettings />);

    await act(async () => {
      await fireEvent.press(view.getByLabelText(t.song.presetLabel(128)));
    });

    await waitFor(() => expect(useProjectStore.getState().project?.bpm).toBe(128));
    expect(mockPersist).toHaveBeenCalledTimes(1);
  });

  it('いま選んでいるプリセットを押し直しても、保存へ行かない', async () => {
    const view = await renderWithProviders(<SongSettings />);

    await act(async () => {
      await fireEvent.press(view.getByLabelText(t.song.presetLabel(128)));
    });
    mockPersist.mockClear();

    await act(async () => {
      await fireEvent.press(view.getByLabelText(t.song.presetLabel(128)));
    });

    expect(mockPersist).not.toHaveBeenCalled();
  });

  it('拍子を選ぶと、作品の拍子が変わる', async () => {
    const view = await renderWithProviders(<SongSettings />);

    await act(async () => {
      await fireEvent.press(view.getByText(t.song.beatsOption(3)));
    });

    await waitFor(() => expect(useProjectStore.getState().project?.beatsPerBar).toBe(3));
  });

  it('曲の開始位置は 0.1秒まで丸める', async () => {
    const view = await renderWithProviders(<SongSettings />);
    const input = view.getByLabelText(t.song.offset);

    // 打つのと確定は【別々に】。同じ act の中でまとめると、blur を拾う
    // 関数が打つ前の下書きを掴んだままになる（0 のまま確定してしまう）
    await act(async () => {
      await fireEvent.changeText(input, '12.56');
    });
    await act(async () => {
      await fireEvent(input, 'blur');
    });

    await waitFor(() =>
      expect(useProjectStore.getState().project?.musicOffsetSeconds).toBe(12.6),
    );
  });

  it('保存に失敗したら、元の値へ戻して知らせる', async () => {
    mockPersist.mockRejectedValue(new Error('offline'));
    const view = await renderWithProviders(<SongSettings />);

    await act(async () => {
      await fireEvent.press(view.getByLabelText(t.song.presetLabel(140)));
    });

    await waitFor(() => {
      expect(useProjectStore.getState().project?.bpm).toBe(120);
      expect(useUIStore.getState().toast?.message).toBe(t.song.bpmFailed);
    });
  });
});
