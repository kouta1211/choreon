import { fireEvent, waitFor } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/render';

import { ConfirmDialog } from './confirm-dialog';
import { useUIStore } from '@/features/canvas/store/useUIStore';

/**
 * 取り消せない操作の確認。**画面のテストがここから始まる。**
 *
 * ■ なぜここを最初に押さえるのか
 * 削除は間違えると戻せない。「やめる」を押したのに消えた、
 * 「削除する」を押したのに消えない、のどちらも user 側で初めて分かる
 * 種類の壊れ方で、私の手元（ブラウザ）では**本物の削除を試せない**。
 *
 * 板そのものはストアの中身を描くだけなので、ストアへ入れて確かめられる。
 */
describe('ConfirmDialog', () => {
  beforeEach(() => {
    useUIStore.setState({ confirm: null });
  });

  it('頼まれていなければ、板は出ない', async () => {
    const view = await renderWithProviders(<ConfirmDialog />);

    expect(view.queryByText('消しますか')).toBeNull();
  });

  it('頼まれた中身をそのまま出す（一緒に消えるものの数も）', async () => {
    useUIStore.getState().requestConfirm({
      title: '「シーン1」を消しますか',
      description: 'このシーンと、そこに置いた立ち位置がまとめて消えます。',
      meta: ['5 人ぶんの立ち位置'],
      onConfirm: () => {},
    });
    const view = await renderWithProviders(<ConfirmDialog />);

    expect(view.getByText('「シーン1」を消しますか')).toBeTruthy();
    expect(view.getByText('5 人ぶんの立ち位置')).toBeTruthy();
  });

  // ここが無いと「元に戻す」で戻せると思われる
  it('元に戻せないことを必ず出す', async () => {
    useUIStore.getState().requestConfirm({ title: '消しますか', onConfirm: () => {} });
    const view = await renderWithProviders(<ConfirmDialog />);

    expect(view.getByText(/元に戻せません/)).toBeTruthy();
  });

  it('やめると、実行せずに閉じる', async () => {
    const onConfirm = jest.fn();
    useUIStore.getState().requestConfirm({ title: '消しますか', onConfirm });
    const view = await renderWithProviders(<ConfirmDialog />);

    await fireEvent.press(view.getByText('やめる'));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(useUIStore.getState().confirm).toBeNull();
  });

  it('削除すると実行して、閉じる', async () => {
    const onConfirm = jest.fn();
    useUIStore.getState().requestConfirm({ title: '消しますか', onConfirm });
    const view = await renderWithProviders(<ConfirmDialog />);

    await fireEvent.press(view.getByText('削除する'));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(useUIStore.getState().confirm).toBeNull());
  });

  // 削除は通信を伴う。二度押すと2回目が「もう無い行の削除」になる
  it('実行している間は閉じない', async () => {
    let release: () => void = () => {};
    const onConfirm = jest.fn(
      () => new Promise<void>((resolve) => { release = resolve; }),
    );
    useUIStore.getState().requestConfirm({ title: '消しますか', onConfirm });
    const view = await renderWithProviders(<ConfirmDialog />);

    await fireEvent.press(view.getByText('削除する'));

    // 実行中は「削除中…」に変わり、板も残っている
    await waitFor(() => expect(view.getByText('削除中…')).toBeTruthy());
    expect(useUIStore.getState().confirm).not.toBeNull();

    release();
    await waitFor(() => expect(useUIStore.getState().confirm).toBeNull());
  });

  it('実行ボタンの文言を差し替えられる（削除以外にも使う）', async () => {
    useUIStore.getState().requestConfirm({
      title: 'リンクを作り直しますか',
      confirmLabel: '作り直す',
      onConfirm: () => {},
    });
    const view = await renderWithProviders(<ConfirmDialog />);

    expect(view.getByText('作り直す')).toBeTruthy();
    expect(view.queryByText('削除する')).toBeNull();
  });
});
