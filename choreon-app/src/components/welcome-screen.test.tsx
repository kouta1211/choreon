import { act, fireEvent } from '@testing-library/react-native';

import { WelcomeScreen } from './welcome-screen';
import { renderWithProviders } from '@/test/render';
import { useUIStore } from '@/features/canvas/store/useUIStore';
import { getT } from '@/features/i18n/store/useLocaleStore';

/**
 * 始め方を選ぶ画面。
 *
 * ここで押さえたいのは **案内を見るかどうかの意思が、押した時点で
 * ストアへ渡ること**。渡し損ねると `guestTourIntent` が null のままになり、
 * 「案内から始める」をオンにしても、既に一度見た端末では案内が出ない
 * （画面は何事もなく進むので、抜けたことに気づけない）。
 */
describe('WelcomeScreen', () => {
  const t = getT();

  beforeEach(() => {
    useUIStore.setState({ guestTourIntent: null });
  });

  it('案内はオンで始まる（要らない人が1回外す形）', async () => {
    const view = await renderWithProviders(
      <WelcomeScreen onGuestStart={() => {}} onOpenAccount={() => {}} />,
    );

    expect(view.getByLabelText(t.welcome.withTour).props.accessibilityState.checked).toBe(
      true,
    );
  });

  it('オンのまま始めると、案内を出す意思を渡す', async () => {
    const onGuestStart = jest.fn();
    const view = await renderWithProviders(
      <WelcomeScreen onGuestStart={onGuestStart} onOpenAccount={() => {}} />,
    );

    await act(async () => {
      await fireEvent.press(view.getByText(t.welcome.guestStart));
    });

    expect(useUIStore.getState().guestTourIntent).toBe('show');
    expect(onGuestStart).toHaveBeenCalledTimes(1);
  });

  it('オフにして始めると、出さない意思を渡す', async () => {
    const view = await renderWithProviders(
      <WelcomeScreen onGuestStart={() => {}} onOpenAccount={() => {}} />,
    );

    await act(async () => {
      await fireEvent.press(view.getByLabelText(t.welcome.withTour));
    });
    await act(async () => {
      await fireEvent.press(view.getByText(t.welcome.guestStart));
    });

    expect(useUIStore.getState().guestTourIntent).toBe('skip');
  });

  it('ログインは、入力欄のある場所を開くだけ', async () => {
    const onOpenAccount = jest.fn();
    const view = await renderWithProviders(
      <WelcomeScreen onGuestStart={() => {}} onOpenAccount={onOpenAccount} />,
    );

    await act(async () => {
      await fireEvent.press(view.getByText(t.welcome.signIn));
    });

    expect(onOpenAccount).toHaveBeenCalledTimes(1);
    // 案内の意思は、ゲストで始めたときだけ渡す
    expect(useUIStore.getState().guestTourIntent).toBeNull();
  });
});
