import { fireEvent, waitFor } from '@testing-library/react-native';

import { SaveChangesButton } from './save-changes-button';
import { renderWithProviders } from '@/test/render';
import { makeProject } from '@/test/factories';
import { useProjectStore } from '@/features/project/store/useProjectStore';
import { useSettingsStore } from '@/features/settings/store/useSettingsStore';
import { useUIStore } from '@/features/canvas/store/useUIStore';
import { flushPendingWrites } from '@/features/project/lib/persistence';
import { getT } from '@/features/i18n/store/useLocaleStore';

/**
 * ヘッダーの「保存」。**出る条件**をここで押さえる。
 *
 * この部品は `hasUnsavedChanges` を読む唯一の場所で、それまでこの印は
 * ストアに立つだけで誰にも読まれていなかった。出る条件を間違えると
 * 元の「誰も読まない」状態に戻るので、3通り(自動保存が入っている／
 * 下書き／切っている)を全部書いておく。
 */
jest.mock('@/features/project/lib/persistence', () => ({
  flushPendingWrites: jest.fn(),
}));

const mockFlush = flushPendingWrites as jest.MockedFunction<typeof flushPendingWrites>;

function load({ isGuest, isAutoSaveEnabled, hasUnsavedChanges }: {
  isGuest: boolean;
  isAutoSaveEnabled: boolean;
  hasUnsavedChanges: boolean;
}) {
  useProjectStore.getState().hydrate({
    project: makeProject({ id: 'p1' }),
    dancers: [],
    scenes: [],
    positions: [],
    isGuest,
  });
  if (hasUnsavedChanges) useProjectStore.getState().markUnsaved();
  useSettingsStore.setState({ isAutoSaveEnabled });
  useUIStore.setState({ toast: null });
}

describe('SaveChangesButton', () => {
  const t = getT();

  beforeEach(() => {
    mockFlush.mockReset();
    mockFlush.mockResolvedValue(undefined);
  });

  it('自動保存が入っている間は出さない', async () => {
    load({ isGuest: false, isAutoSaveEnabled: true, hasUnsavedChanges: true });
    const view = await renderWithProviders(<SaveChangesButton />);

    expect(view.queryByLabelText(t.settings.app.autoSave.flush)).toBeNull();
  });

  it('下書きには出さない（クラウドに置き場所が無い）', async () => {
    load({ isGuest: true, isAutoSaveEnabled: false, hasUnsavedChanges: true });
    const view = await renderWithProviders(<SaveChangesButton />);

    expect(view.queryByLabelText(t.settings.app.autoSave.flush)).toBeNull();
  });

  it('自動保存を切っていて、まだ送っていない変更があれば押せる', async () => {
    load({ isGuest: false, isAutoSaveEnabled: false, hasUnsavedChanges: true });
    const view = await renderWithProviders(<SaveChangesButton />);

    expect(view.getByText(t.settings.app.autoSave.flush)).toBeTruthy();
    // まだ送られていない印
    expect(view.getByText('●')).toBeTruthy();
  });

  it('送るものが無ければ、出るが押せない', async () => {
    load({ isGuest: false, isAutoSaveEnabled: false, hasUnsavedChanges: false });
    const view = await renderWithProviders(<SaveChangesButton />);

    expect(view.getByText(t.settings.app.autoSave.done)).toBeTruthy();
    expect(view.queryByText('●')).toBeNull();
  });

  it('押すと、貯めてある書き込みを送る', async () => {
    load({ isGuest: false, isAutoSaveEnabled: false, hasUnsavedChanges: true });
    const view = await renderWithProviders(<SaveChangesButton />);

    await fireEvent.press(view.getByLabelText(t.settings.app.autoSave.flush));

    await waitFor(() => expect(mockFlush).toHaveBeenCalledTimes(1));
  });

  it('送れなかったら、やり直せる知らせを出す', async () => {
    load({ isGuest: false, isAutoSaveEnabled: false, hasUnsavedChanges: true });
    mockFlush.mockRejectedValue(new Error('offline'));
    const view = await renderWithProviders(<SaveChangesButton />);

    await fireEvent.press(view.getByLabelText(t.settings.app.autoSave.flush));

    await waitFor(() => {
      const toast = useUIStore.getState().toast;
      expect(toast?.type).toBe('error');
      expect(toast?.action?.label).toBe(t.common.retry);
    });
  });
});
