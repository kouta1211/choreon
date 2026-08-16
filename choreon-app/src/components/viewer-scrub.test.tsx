import { act, fireEvent } from '@testing-library/react-native';

import { ViewerScrub } from './viewer-scrub';
import { StageView } from './stage-view';
import { renderWithProviders } from '@/test/render';
import { makeDancer, makePosition, makeProject, makeScene } from '@/test/factories';
import { useProjectStore } from '@/features/project/store/useProjectStore';
import { usePlaybackStore } from '@/features/music/store/usePlaybackStore';
import { useUIStore } from '@/features/canvas/store/useUIStore';
import { getT } from '@/features/i18n/store/useLocaleStore';

/**
 * ビューアのスクラブ帯と、時刻で描くステージ。
 *
 * ■ なぜここを試すのか
 * この画面は**共有リンクが要る**ので、私の手元ではブラウザで開けない
 * （リンクは他人の作品を指す）。指の操作そのものは合成イベントでは
 * 動かないので、**秒を動かしたときに何が変わるか**をここで押さえる。
 *
 * いちばん大事なのは「区間の途中で止まれること」。シーンに吸われると、
 * この画面の値打ちがそのまま消える。
 */
function load() {
  useProjectStore.getState().hydrate({
    project: makeProject({ id: 'p1', stageWidth: 14, stageHeight: 10 }),
    dancers: [makeDancer({ id: 'd1', name: 'あかり' })],
    scenes: [
      makeScene({ id: 's1', name: 'シーン1', timeSeconds: 0 }),
      makeScene({ id: 's2', name: 'シーン2', timeSeconds: 4 }),
    ],
    positions: [
      makePosition({ sceneId: 's1', dancerId: 'd1', xCoordinate: 2, yCoordinate: 5 }),
      makePosition({ sceneId: 's2', dancerId: 'd1', xCoordinate: 10, yCoordinate: 5 }),
    ],
    isGuest: true,
  });
  useUIStore.setState({ selectedSceneId: 's1', isPlaying: false });
  usePlaybackStore.setState({ currentTime: 0 });
}

describe('ViewerScrub', () => {
  const t = getT();

  beforeEach(load);

  it('いまの秒と、そこに居るシーンを出す', async () => {
    usePlaybackStore.setState({ currentTime: 2.5 });
    const view = await renderWithProviders(
      <ViewerScrub focusedDancerId="d1" stageWidthUnits={14} stageHeightUnits={10} />,
    );

    // 2.5秒は シーン1（0s）と シーン2（4s）のあいだ＝手前は シーン1
    expect(view.getByText(t.viewer.scrub.clock('2.5', 'シーン1'))).toBeTruthy();
  });

  it('コマを押すと、その時刻へ動く', async () => {
    const view = await renderWithProviders(
      <ViewerScrub focusedDancerId="d1" stageWidthUnits={14} stageHeightUnits={10} />,
    );

    await act(async () => {
      await fireEvent.press(view.getByLabelText('シーン2'));
    });

    expect(usePlaybackStore.getState().currentTime).toBe(4);
  });
});

describe('時刻で描くステージ', () => {
  beforeEach(load);

  /** その人が画面のどこに置かれているか（左からの割合） */
  async function leftPercentAt(seconds: number) {
    const view = await renderWithProviders(
      <StageView stageWidthUnits={14} stageHeightUnits={10} isReadOnly atSeconds={seconds} />,
    );
    const dot = view.getByLabelText('あかり');
    const style = Array.isArray(dot.props.style)
      ? Object.assign({}, ...dot.props.style.flat())
      : dot.props.style;
    return style.left as string;
  }

  it('シーンの時刻ちょうどなら、そのシーンの位置', async () => {
    // x=2 / 14マス
    expect(await leftPercentAt(0)).toBe(`${(2 / 14) * 100}%`);
  });

  it('区間の途中では、そのあいだの位置になる（シーンへ吸わない）', async () => {
    const half = await leftPercentAt(2);
    const start = (2 / 14) * 100;
    const end = (10 / 14) * 100;
    const value = Number.parseFloat(half);

    // ちょうど真ん中とは限らない（イージングが効く）が、
    // **両端のどちらでもない**ことがこの画面の値打ち
    expect(value).toBeGreaterThan(start);
    expect(value).toBeLessThan(end);
  });
});
