import { AccountPanel } from '@/components/account-panel';

/**
 * 設定の「アカウント」。ログインと、作品を開くところ。
 *
 * 中身は既にある AccountPanel。**シートの中へ移しただけ**で、
 * ログイン・一覧・開く・ログアウトの動きは何も変えていない。
 *
 * @param onProjectLoaded 作品を開いたときに、その広さを画面へ返す
 *   （ステージの形が作品ごとに違うため）
 */
export function SettingsAccountSection({
  onProjectLoaded,
}: {
  onProjectLoaded: (stage: { width: number; height: number }) => void;
}) {
  return <AccountPanel onProjectLoaded={onProjectLoaded} />;
}
