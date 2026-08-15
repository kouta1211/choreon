import {
  VIEWER_FOCUS_STORAGE_KEY,
  loadFocusedDancerId,
  saveFocusedDancerId,
} from './focusPreference';
import { storage } from '@/lib/storage';

/**
 * 選んだポジションの覚え方。**Web版のテストを非同期に直したもの。**
 * 検証の規則（知らない形は落とす）は同じ。
 */
describe('focusPreference', () => {
  beforeEach(async () => {
    await storage.removeItem(VIEWER_FOCUS_STORAGE_KEY);
  });

  it('覚えていなければ null', async () => {
    await expect(loadFocusedDancerId('project-1')).resolves.toBeNull();
  });

  it('作品ごとに別々に持つ', async () => {
    await saveFocusedDancerId('project-1', 'dancer-a');
    await saveFocusedDancerId('project-2', 'dancer-b');

    await expect(loadFocusedDancerId('project-1')).resolves.toBe('dancer-a');
    await expect(loadFocusedDancerId('project-2')).resolves.toBe('dancer-b');
  });

  it('選び直すと上書きする', async () => {
    await saveFocusedDancerId('project-1', 'dancer-a');
    await saveFocusedDancerId('project-1', 'dancer-c');

    await expect(loadFocusedDancerId('project-1')).resolves.toBe('dancer-c');
  });

  it('null を渡すと忘れる', async () => {
    await saveFocusedDancerId('project-1', 'dancer-a');
    await saveFocusedDancerId('project-1', null);

    await expect(loadFocusedDancerId('project-1')).resolves.toBeNull();
  });

  // 端末に置いた値は書き換えられる。壊れていても画面は動かす
  it('壊れたJSONは空として読む', async () => {
    await storage.setItem(VIEWER_FOCUS_STORAGE_KEY, '{壊れている');

    await expect(loadFocusedDancerId('project-1')).resolves.toBeNull();
  });

  it('文字列でない値は落とす', async () => {
    await storage.setItem(
      VIEWER_FOCUS_STORAGE_KEY,
      JSON.stringify({ 'project-1': 42, 'project-2': '', 'project-3': 'dancer-x' }),
    );

    await expect(loadFocusedDancerId('project-1')).resolves.toBeNull();
    await expect(loadFocusedDancerId('project-2')).resolves.toBeNull();
    await expect(loadFocusedDancerId('project-3')).resolves.toBe('dancer-x');
  });
});
