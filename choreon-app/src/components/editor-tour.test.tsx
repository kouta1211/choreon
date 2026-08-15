import { act, fireEvent, waitFor } from '@testing-library/react-native';

import { EditorTour } from './editor-tour';
import { renderWithProviders } from '@/test/render';
import { useUIStore } from '@/features/canvas/store/useUIStore';
import { getT } from '@/features/i18n/store/useLocaleStore';
import {
  clearTourTargets,
  measureTourTarget,
  type TourTargetName,
} from '@/features/tutorial/lib/tourTargets';
import { hasSeenTutorial, markTutorialSeen } from '@/features/tutorial/lib/tutorialPreference';

/**
 * 使い方の案内。**進み具合の数**をここで押さえる。
 *
 * ■ なぜそこなのか
 * 段は「指す先が画面に出ていれば出す」。曲を入れていなければ時間軸は
 * 無いし、広い画面では下の帯そのものが無い。その場で飛ばす作りにすると
 * 1/5 → 3/5 と数が飛び、読んでいる側には数え間違いに見える。
 * **始める前に測って落とす**のがこの部品の要で、壊れても画面は
 * 一見動いてしまう（数だけが変わる）ので、テストで留める。
 *
 * 測る先と、見たかどうかの覚えを差し替える。案内の進み方そのものは
 * 本物のまま動かす。
 */
jest.mock('@/features/tutorial/lib/tourTargets', () => {
  const actual = jest.requireActual('@/features/tutorial/lib/tourTargets');
  return { ...actual, measureTourTarget: jest.fn() };
});
jest.mock('@/features/tutorial/lib/tutorialPreference', () => ({
  hasSeenTutorial: jest.fn(),
  markTutorialSeen: jest.fn(),
}));

const mockMeasure = measureTourTarget as jest.MockedFunction<typeof measureTourTarget>;
const mockHasSeen = hasSeenTutorial as jest.MockedFunction<typeof hasSeenTutorial>;
const mockMarkSeen = markTutorialSeen as jest.MockedFunction<typeof markTutorialSeen>;

const RECT = { x: 10, y: 100, width: 200, height: 80 };

/** 画面に出ている先だけを答える。並べていない名前は「無い」 */
function present(...names: TourTargetName[]) {
  mockMeasure.mockImplementation(async (name) => (names.includes(name) ? RECT : null));
}

describe('EditorTour', () => {
  const t = getT();

  beforeEach(() => {
    jest.useFakeTimers();
    clearTourTargets();
    mockMeasure.mockReset();
    mockHasSeen.mockReset().mockResolvedValue(false);
    mockMarkSeen.mockReset().mockResolvedValue(undefined);
    useUIStore.setState({ tourRequestedAt: null, guestTourIntent: null });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  /**
   * 自動で出るまでの 500ms を進める。
   *
   * 2回に分けているのは、待ち時間を仕掛けるのが **hasSeenTutorial() の
   * 答えを待ったあと**だから。先に約束を1回流しておかないと、進めた時点で
   * まだタイマーが仕掛かっていない。
   */
  async function advanceToStart() {
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      jest.advanceTimersByTime(600);
    });
  }

  it('もう見た人には自動で出さない', async () => {
    mockHasSeen.mockResolvedValue(true);
    present('stage', 'scene-dock', 'add-scene', 'display-menu');
    const view = await renderWithProviders(<EditorTour />);

    await advanceToStart();

    expect(view.queryByText(t.tour.stageTitle)).toBeNull();
  });

  it('ゲストで「案内は要らない」を選んでいれば、出さない', async () => {
    useUIStore.setState({ guestTourIntent: 'skip' });
    present('stage');
    const view = await renderWithProviders(<EditorTour />);

    await advanceToStart();

    expect(view.queryByText(t.tour.stageTitle)).toBeNull();
  });

  it('初めての人には自動で出る', async () => {
    present('stage', 'scene-dock', 'add-scene', 'display-menu');
    const view = await renderWithProviders(<EditorTour />);

    await advanceToStart();

    await waitFor(() => expect(view.getByText(t.tour.stageTitle)).toBeTruthy());
  });

  it('出ていない段は数に入れない（曲が無ければ時間軸は 4段中に現れない）', async () => {
    present('stage', 'scene-dock', 'add-scene', 'display-menu');
    const view = await renderWithProviders(<EditorTour />);
    await advanceToStart();

    await waitFor(() => expect(view.getByText(t.tour.nextWithProgress(1, 4))).toBeTruthy());

    await act(async () => {
      await fireEvent.press(view.getByText(t.tour.nextWithProgress(1, 4)));
    });

    // 時間軸ではなく、シーンの帯の説明が来る
    expect(view.getByText(t.tour.dockTitle)).toBeTruthy();
    expect(view.getByText(t.tour.nextWithProgress(2, 4))).toBeTruthy();
  });

  it('曲があるときは時間軸の説明になる', async () => {
    present('stage', 'timeline', 'add-scene', 'display-menu');
    const view = await renderWithProviders(<EditorTour />);
    await advanceToStart();
    await waitFor(() => expect(view.getByText(t.tour.stageTitle)).toBeTruthy());

    await act(async () => {
      await fireEvent.press(view.getByText(t.tour.nextWithProgress(1, 4)));
    });

    expect(view.getByText(t.tour.timelineTitle)).toBeTruthy();
    expect(view.queryByText(t.tour.dockTitle)).toBeNull();
  });

  it('指せる先が1つしか無ければ、その1段で終わる', async () => {
    present('stage');
    const view = await renderWithProviders(<EditorTour />);
    await advanceToStart();

    await waitFor(() => expect(view.getByText(t.tour.stageTitle)).toBeTruthy());
    // 最後の段なので「次へ」ではなく「はじめる」
    expect(view.getByText(t.tour.last)).toBeTruthy();
  });

  it('とばしても「見た」として覚える', async () => {
    present('stage', 'scene-dock', 'add-scene', 'display-menu');
    const view = await renderWithProviders(<EditorTour />);
    await advanceToStart();
    await waitFor(() => expect(view.getByText(t.tour.stageTitle)).toBeTruthy());

    await act(async () => {
      await fireEvent.press(view.getByText(t.tour.skip));
    });

    expect(mockMarkSeen).toHaveBeenCalled();
    expect(view.queryByText(t.tour.stageTitle)).toBeNull();
  });

  it('もう見た人でも、頼まれたら出す', async () => {
    mockHasSeen.mockResolvedValue(true);
    present('stage', 'display-menu');
    const view = await renderWithProviders(<EditorTour />);
    await advanceToStart();
    expect(view.queryByText(t.tour.stageTitle)).toBeNull();

    await act(async () => {
      useUIStore.getState().requestTour();
      await Promise.resolve();
    });

    await waitFor(() => expect(view.getByText(t.tour.stageTitle)).toBeTruthy());
  });
});
