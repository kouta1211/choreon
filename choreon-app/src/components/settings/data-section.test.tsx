import { act, fireEvent, waitFor } from '@testing-library/react-native';

import { SettingsDataSection } from './data-section';
import { renderWithProviders } from '@/test/render';
import { makeDancer, makePosition, makeProject, makeScene } from '@/test/factories';
import { useProjectStore } from '@/features/project/store/useProjectStore';
import { useUIStore } from '@/features/canvas/store/useUIStore';
import { persist, pendingWriteCount } from '@/features/project/lib/persistence';
import { getT } from '@/features/i18n/store/useLocaleStore';

/**
 * 設定 → データ の「この作品を空にする」。
 *
 * ■ 何を押さえたいか
 * これは**戻せない**操作で、しかも消す対象が2種類ある（シーンとダンサー）。
 * 数を出さずに実行させると、何が消えるか分からないまま押される。
 * ここでは「確認に数が出るか」「作品そのものは残るか」を見る。
 *
 * 保存の窓口 `persist` は差し替える（手元ではログインできないため）。
 * 呼び出し側の手順は本物のまま動かす。
 */
jest.mock('@/features/project/lib/persistence', () => ({
  persist: jest.fn(),
  pendingWriteCount: jest.fn(() => 0),
}));

const mockPersist = persist as jest.MockedFunction<typeof persist>;
const mockPendingWriteCount = pendingWriteCount as jest.MockedFunction<typeof pendingWriteCount>;

const PROJECT = makeProject({ id: 'p1', title: '本番用' });

function load(isGuest: boolean) {
  useProjectStore.getState().hydrate({
    project: PROJECT,
    dancers: [makeDancer({ id: 'd1' }), makeDancer({ id: 'd2' })],
    scenes: [
      makeScene({ id: 's1', timeSeconds: 0 }),
      makeScene({ id: 's2', timeSeconds: 4 }),
      makeScene({ id: 's3', timeSeconds: 8 }),
    ],
    positions: [makePosition({ sceneId: 's1', dancerId: 'd1' })],
    isGuest,
  });
  useUIStore.setState({ confirm: null, selectedSceneId: 's1', selectedDancerId: 'd1' });
}

/** 確認ダイアログは別部品なので、ここではストアに入った依頼を直に実行する */
async function runConfirm() {
  const request = useUIStore.getState().confirm;
  expect(request).not.toBeNull();
  // 中で setState が走る（失敗の知らせ）ので act で包む
  await act(async () => {
    await request!.onConfirm();
  });
}

describe('SettingsDataSection の「この作品を空にする」', () => {
  const t = getT();

  beforeEach(() => {
    mockPersist.mockReset();
    mockPersist.mockResolvedValue(null);
    mockPendingWriteCount.mockReturnValue(0);
    load(false);
  });

  it('下書きには出さない（開き直せば元に戻るので、空にする意味が無い）', async () => {
    load(true);
    const view = await renderWithProviders(<SettingsDataSection />);

    expect(view.queryByText(t.data.resetLabel)).toBeNull();
  });

  it('いきなり消さず、消える数を添えて確認する', async () => {
    const view = await renderWithProviders(<SettingsDataSection />);

    await fireEvent.press(view.getByText(t.data.resetLabel));

    const request = useUIStore.getState().confirm;
    expect(request?.title).toBe(t.data.resetTitle);
    expect(request?.meta).toEqual([t.data.resetMetaScenes(3), t.data.resetMetaDancers(2)]);
    // この時点ではまだ何も送っていない
    expect(mockPersist).not.toHaveBeenCalled();
  });

  it('実行すると中身が空になり、作品そのものは残る', async () => {
    const view = await renderWithProviders(<SettingsDataSection />);
    await fireEvent.press(view.getByText(t.data.resetLabel));

    await runConfirm();

    await waitFor(() => {
      const state = useProjectStore.getState();
      expect(state.scenes).toEqual([]);
      expect(Object.keys(state.dancers)).toEqual([]);
      // 名前とステージの広さは残る
      expect(state.project?.id).toBe('p1');
      expect(state.project?.title).toBe('本番用');
    });
    // 消えたものを選んだままにしない
    expect(useUIStore.getState().selectedSceneId).toBeNull();
    expect(useUIStore.getState().selectedDancerId).toBeNull();
  });

  it('自動保存を切っていて送信待ちが残るなら、未保存の印を立て直す', async () => {
    // hydrate は「サーバーと一致した」印なので未保存を落とす。
    // まだ送っていない削除があるなら、落としたままにはできない
    mockPendingWriteCount.mockReturnValue(5);
    const view = await renderWithProviders(<SettingsDataSection />);
    await fireEvent.press(view.getByText(t.data.resetLabel));

    await runConfirm();

    await waitFor(() => expect(useProjectStore.getState().hasUnsavedChanges).toBe(true));
  });

  it('送れなかったら、消さずに理由を出す', async () => {
    mockPersist.mockRejectedValue(new Error('offline'));
    const view = await renderWithProviders(<SettingsDataSection />);
    await fireEvent.press(view.getByText(t.data.resetLabel));

    await runConfirm();

    await waitFor(() => expect(view.getByText(t.data.resetFailed)).toBeTruthy());
    // 画面の中身は消していない
    expect(useProjectStore.getState().scenes).toHaveLength(3);
  });
});
