import { StageView } from './stage-view';
import { renderWithProviders } from '@/test/render';
import { makeDancer, makePosition, makeProject, makeScene } from '@/test/factories';
import { useProjectStore } from '@/features/project/store/useProjectStore';
import { useUIStore } from '@/features/canvas/store/useUIStore';
import { getT } from '@/features/i18n/store/useLocaleStore';

/**
 * 読むだけのステージ（共有リンクを開いた人の画面）。
 *
 * ■ なぜテストで留めるのか
 * これは**開かれていても画面は何ともない**種類の抜けだった。読んでいる人が
 * 指でダンサーを動かせ、回転ハンドルも触れたが、見た目は普通に動くので
 * 「壊れている」とは映らない。閉じ忘れてもテストでしか気づけない。
 */
function load() {
  useProjectStore.getState().hydrate({
    project: makeProject({ id: 'p1', stageWidth: 14, stageHeight: 10 }),
    dancers: [makeDancer({ id: 'd1', name: 'あかり' })],
    scenes: [makeScene({ id: 's1', timeSeconds: 0 }), makeScene({ id: 's2', timeSeconds: 4 })],
    positions: [
      makePosition({ sceneId: 's1', dancerId: 'd1', xCoordinate: 3 }),
      makePosition({ sceneId: 's2', dancerId: 'd1', xCoordinate: 9 }),
    ],
    isGuest: true,
  });
  // 選んだ状態にする — 回転ハンドルは「選んでいるとき」に出るため
  useUIStore.setState({ selectedSceneId: 's1', selectedDancerId: 'd1' });
}

describe('StageView（読むだけ）', () => {
  const t = getT();

  beforeEach(load);

  it('編集できるときは、回転ハンドルが出る', async () => {
    const view = await renderWithProviders(
      <StageView stageWidthUnits={14} stageHeightUnits={10} />,
    );

    expect(view.queryByLabelText(t.stage.rotate)).not.toBeNull();
  });

  it('読むだけなら、選んでも回転ハンドルを出さない', async () => {
    const view = await renderWithProviders(
      <StageView stageWidthUnits={14} stageHeightUnits={10} isReadOnly />,
    );

    expect(view.queryByLabelText(t.stage.rotate)).toBeNull();
  });
});
