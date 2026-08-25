import type { Metadata } from "next";
import { BeatCheck } from "@/components/organisms/BeatCheck";

/**
 * **拍の自動検出を、本物の曲で試すための場所。作りかけの道具。**
 *
 * 合成したクリック音のテスト(`beatDetect.test.ts`)で守れるのは
 * 「正解が分かっている音を正しく読めるか」まで。**本物の曲で当たるかは、
 * 実際に食わせて目と耳で見るしかない**。
 *
 * ■ 本番でも開ける（2026-08-25）
 * user が本番(Vercel)で確かめるため。**URL を知っていれば誰でも開ける**が、
 * どこからもリンクしておらず、検索にも出さない(下の robots)。
 * 音は端末の中だけで読み、どこへも送らない。
 *
 * ⚠️ **カウント軸を入れたら消す。** user 向けの画面ではないので、
 * 残しておくと「Choreon にこういう機能がある」と誤解される。
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function BeatCheckPage() {
  return <BeatCheck />;
}
