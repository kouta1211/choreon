import { act } from '@testing-library/react-native';

import { StageView } from './stage-view';
import { renderWithProviders } from '@/test/render';
import { makeDancer, makePosition, makeProject, makeScene } from '@/test/factories';
import { useProjectStore } from '@/features/project/store/useProjectStore';
import { useUIStore } from '@/features/canvas/store/useUIStore';
import { NO_SNAP_LINE } from '@/features/canvas/lib/snapLine';

/**
 * 吸い付く先の格子線。
 *
 * 求め方は snapLine.test.ts。ここで見るのは**画面に出るところ**だけ
 * ——「掴んでいない間は出ない」「出るときは正しい位置に出る」。
 * 指の代わりに、ストアへ直に値を入れて確かめる（合成した指のイベントでは
 * PanResponder が動かないため）。
 */
function load() {
  useProjectStore.getState().hydrate({
    project: makeProject({ id: 'p1', stageWidth: 14, stageHeight: 10 }),
    dancers: [makeDancer({ id: 'd1' })],
    scenes: [makeScene({ id: 's1', timeSeconds: 0 })],
    positions: [makePosition({ sceneId: 's1', dancerId: 'd1' })],
    isGuest: true,
  });
  useUIStore.setState({ selectedSceneId: 's1', dragSnapLine: NO_SNAP_LINE });
}

describe('StageView の吸着線', () => {
  beforeEach(load);

  it('掴んでいない間は出ない', async () => {
    const view = await renderWithProviders(
      <StageView stageWidthUnits={14} stageHeightUnits={10} />,
    );

    expect(view.queryByTestId('snap-line-x')).toBeNull();
    expect(view.queryByTestId('snap-line-y')).toBeNull();
  });

  it('縦の線だけ近いときは、縦の1本だけ出る', async () => {
    const view = await renderWithProviders(
      <StageView stageWidthUnits={14} stageHeightUnits={10} />,
    );

    await act(async () => {
      useUIStore.getState().setDragSnapLine({ x: 5, y: null });
    });

    expect(view.getByTestId('snap-line-x')).toBeTruthy();
    expect(view.queryByTestId('snap-line-y')).toBeNull();
  });

  it('交差点なら2本とも出て、割合で位置が決まる', async () => {
    const view = await renderWithProviders(
      <StageView stageWidthUnits={14} stageHeightUnits={10} />,
    );

    await act(async () => {
      useUIStore.getState().setDragSnapLine({ x: 7, y: 5 });
    });

    // 14マスの7＝ちょうど半分、10マスの5＝ちょうど半分
    expect(view.getByTestId('snap-line-x').props.style).toMatchObject({ left: '50%' });
    expect(view.getByTestId('snap-line-y').props.style).toMatchObject({ top: '50%' });
  });
});
