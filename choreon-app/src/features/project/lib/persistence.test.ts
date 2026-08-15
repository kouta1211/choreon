import {
  discardPendingWrites,
  flushPendingWrites,
  pendingWriteCount,
  persist,
} from './persistence';
import { useProjectStore } from '@/features/project/store/useProjectStore';
import { useSettingsStore } from '@/features/settings/store/useSettingsStore';

/**
 * 「保存できるなら保存する」窓口。**ここが緩むと、ゲスト中に401が出るか、
 * 保存したつもりの変更が消える**。ネイティブ版の書き込みは全てここを通る。
 */
describe('persist', () => {
  beforeEach(() => {
    useProjectStore.setState({ isGuest: true, hasUnsavedChanges: false });
    useSettingsStore.setState({ isAutoSaveEnabled: true });
  });

  afterEach(() => {
    // 貯めた書き込みはモジュールに残るので、テスト間で持ち越さない
    discardPendingWrites();
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

/**
 * 自動保存を切っている間の貯め込み。**画面は既に書き換わっている**ので、
 * 貯めたものが実行されないと「見えているのに保存されていない」になる。
 */
describe('自動保存を切っている間', () => {
  beforeEach(() => {
    useProjectStore.setState({ isGuest: false, hasUnsavedChanges: false });
    useSettingsStore.setState({ isAutoSaveEnabled: false });
    discardPendingWrites();
  });

  afterEach(() => {
    useSettingsStore.setState({ isAutoSaveEnabled: true });
    discardPendingWrites();
  });

  it('実行せずに貯め、未保存の印を立てる', async () => {
    const run = jest.fn(async () => 'saved');

    await expect(persist(run)).resolves.toBeNull();
    expect(run).not.toHaveBeenCalled();
    expect(pendingWriteCount()).toBe(1);
    expect(useProjectStore.getState().hasUnsavedChanges).toBe(true);
  });

  // シーンを作ってからそこへ立ち位置を入れる、のような依存がある。
  // まとめて並列に投げると外部キー違反になる
  it('貯めた順に実行する', async () => {
    const order: number[] = [];
    await persist(async () => void order.push(1));
    await persist(async () => void order.push(2));
    await persist(async () => void order.push(3));

    await flushPendingWrites();

    expect(order).toEqual([1, 2, 3]);
    expect(pendingWriteCount()).toBe(0);
    expect(useProjectStore.getState().hasUnsavedChanges).toBe(false);
  });

  // 消してしまうと「保存したはずの変更が次に開いたとき無い」になる
  it('途中で失敗したら、失敗したものとそれ以降を残したまま投げ返す', async () => {
    await persist(async () => 'ok');
    await persist(async () => {
      throw new Error('boom');
    });
    await persist(async () => 'never');

    await expect(flushPendingWrites()).rejects.toThrow('boom');
    expect(pendingWriteCount()).toBe(2);
  });

  // 別の作品を開くときに呼ぶ。持ち越すと前の作品への書き込みが走る
  it('捨てると空になる', async () => {
    await persist(async () => 'ok');
    discardPendingWrites();

    expect(pendingWriteCount()).toBe(0);
  });

  // ゲストの下書きはクラウドに置き場所が無い。markSaved を通すと
  // 「保存済み」に化けてしまう
  it('ゲストの下書きでは何も送らない', async () => {
    useProjectStore.setState({ isGuest: true });
    await persist(async () => 'ok');

    await flushPendingWrites();

    expect(useProjectStore.getState().isGuest).toBe(true);
  });
});
