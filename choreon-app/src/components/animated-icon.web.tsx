/**
 * Web では覆いを出さない。
 *
 * ブラウザには OS の起動画面が無いので、受け渡す相手がいない。
 * （ネイティブ側は `animated-icon.tsx`。Metro が拡張子で選び分ける）
 */
export function AnimatedSplashOverlay() {
  return null;
}
