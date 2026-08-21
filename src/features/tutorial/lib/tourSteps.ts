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
 * 下の帯は、曲もメトロノームも無いと【順番だけ】になる
 * (features/scene/lib/timelineMode.ts)。**初めて開く人は必ずそちら**
 * ―― 作りたての作品に曲は入っていない ―― なので、時刻の話をすると
 * **初回に必ず食い違う**。物差しを見て言い分ける。
 *
 * ここを純粋関数にしてあるのは、**案内が実物とずれていないかを
 * テストで縛るため**。ずれても画面は正しく動くので、人は気づけない。
 */
export function tourSteps(t: Messages, isOrderOnly: boolean): Step[] {
  return [
    {
      target: '[data-tour="stage"]',
      title: t.tour.stageTitle,
      content: t.tour.stageBody,
      placement: "bottom",
    },
    {
      target: '[data-tour="timeline"]',
      title: isOrderOnly ? t.tour.timelineOrderTitle : t.tour.timelineTitle,
      content: isOrderOnly ? t.tour.timelineOrderBody : t.tour.timelineBody,
      placement: "top",
    },
    {
      target: '[data-tour="add-scene"]',
      title: t.tour.addTitle,
      content: isOrderOnly ? t.tour.addOrderBody : t.tour.addBody,
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
