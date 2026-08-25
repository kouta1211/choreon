import { notFound } from "next/navigation";
import { BeatCheck } from "@/components/organisms/BeatCheck";

/**
 * **拍の自動検出を、本物の曲で試すための場所。開発中だけ。**
 *
 * 合成したクリック音のテスト(`beatDetect.test.ts`)で守れるのは
 * 「正解が分かっている音を正しく読めるか」まで。**本物の曲で当たるかは、
 * 実際に食わせて目と耳で見るしかない**。
 *
 * ここは作りかけの道具で、user 向けの画面ではない。カウント軸そのものを
 * 入れる段になったら消す。
 *
 * 本番では出さない — 出しても誰も使わないうえ、
 * 「Choreon にこういう画面がある」と誤解される。
 */
export default function BeatCheckPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <BeatCheck />;
}
