import type { Step } from "react-joyride";
import type { Messages } from "@/features/i18n/messages";

/**
 * 使い方の案内が指す先と、そこで言うこと。
 *
 * ■ 指す先は data-tour で持つ
 * クラス名を目印にすると、見た目を整える過程で消える。案内が指すために
 * 存在する属性を別に付けて、消してよいものと区別する。
 *
 * ■ 案内は、いま目の前にあるものを言う
 * **どの作品でもカウントで組む**ようになった（2026-08-26）ので、
 * 曲の有無で言い分ける必要が無くなった。以前は曲もメトロノームも無い
 * 作品だけ別の文にしていて、**初めて開く人は必ずそちら**（作りたての
 * 作品に曲は入っていない）だった。いまはどちらも同じ文で正しい。
 *
 * ここを純粋関数にしてあるのは、**案内が実物とずれていないかを
 * テストで縛るため**。ずれても画面は正しく動くので、人は気づけない。
 */
export function tourSteps(t: Messages): Step[] {
  return [
    {
      target: '[data-tour="stage"]',
      title: t.tour.stageTitle,
      content: t.tour.stageBody,
      placement: "bottom",
    },
    {
      target: '[data-tour="timeline"]',
      title: t.tour.timelineTitle,
      content: t.tour.timelineBody,
      placement: "top",
    },
    {
      target: '[data-tour="add-scene"]',
      title: t.tour.addTitle,
      content: t.tour.addBody,
      placement: "top",
    },
    {
      target: '[data-tour="display-menu"]',
      title: t.tour.viewTitle,
      content: t.tour.viewBody,
      placement: "bottom",
    },
  ];
}
