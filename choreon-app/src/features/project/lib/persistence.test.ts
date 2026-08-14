import { persist } from './persistence';
import { useProjectStore } from '@/features/project/store/useProjectStore';

/**
 * 「保存できるなら保存する」窓口。**ここが緩むと、ゲスト中に401が出るか、
 * 保存したつもりの変更が消える**。ネイティブ版の書き込みは全てここを通る。
 */
describe('persist', () => {
  beforeEach(() => {
    useProjectStore.setState({ isGuest: true, hasUnsavedChanges: false });
  });

  it('ゲスト中は run を呼ばず、null を返す', async () => {
    const run = jest.fn(async () => 'saved');

    await expect(persist(run)).resolves.toBeNull();
    expect(run).not.toHaveBeenCalled();
  });

  // 「本来なら保存していた変更」がここを通る。この印だけで
  // 「未保存の変更があるか」を正確に拾える
  it('ゲスト中に呼ばれたら、未保存の印を立てる', async () => {
    await persist(async () => 'saved');

    expect(useProjectStore.getState().hasUnsavedChanges).toBe(true);
  });

  it('ログイン中は run を呼び、その戻り値を返す', async () => {
    useProjectStore.setState({ isGuest: false });
    const run = jest.fn(async () => 'saved');

    await expect(persist(run)).resolves.toBe('saved');
    expect(run).toHaveBeenCalledTimes(1);
  });

  // 失敗は握りつぶさない。呼び出し側が元へ戻して知らせる
  it('run が投げたら、そのまま投げ返す', async () => {
    useProjectStore.setState({ isGuest: false });

    await expect(
      persist(async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
  });
});
