"use client";

import { ArrowDown } from "lucide-react";
import {
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
} from "@/components/ui/context-menu";
import {
  FACING_DIRECTIONS_IN_READING_ORDER,
  facingLabelKey,
  toStageFacing,
} from "@/features/canvas/lib/facing";
import { useT } from "@/features/i18n/LocaleProvider";

type Props = {
  /** 印を付ける升（画面の向き）。ばらばらなら空文字で、どこにも印が付かない */
  value: string;
  /** 客席を上にして描いているか。升の並びは画面の向きのまま、名前だけ入れ替わる */
  isAudienceOnTop: boolean;
  onChange: (screenAngle: number) => void;
};

/**
 * 向きを選ぶ3×3の升。真ん中は本人の居る場所なので押せない。
 *
 * **升の並びは画面の向きで固定**で、上下を鏡にしても動かない。
 * 動くのは名前の方（画面のいちばん上が「奥を向く」だったり
 * 「客席を向く」だったりする）。押された値も画面の向きなので、
 * ステージの向きへ写すのは受け取った側の仕事。
 */
export function FacingGrid({ value, isAudienceOnTop, onChange }: Props) {
  const t = useT();

  return (
    <ContextMenuRadioGroup
      value={value}
      onValueChange={(next) => onChange(Number(next))}
      className="mx-auto grid w-fit grid-cols-3 grid-rows-3 gap-0.5 p-0.5"
    >
      {FACING_DIRECTIONS_IN_READING_ORDER.map((direction) => {
        const labelKey = facingLabelKey(
          toStageFacing(direction.screenAngle, isAudienceOnTop),
        );
        const label = labelKey ? t.editor.contextMenu.facing[labelKey] : "";
        return (
          <ContextMenuRadioItem
            key={direction.screenAngle}
            value={String(direction.screenAngle)}
            aria-label={t.editor.contextMenu.facing.turn(label)}
            className="h-9 w-9"
            style={{
              gridRow: direction.cell.row,
              gridColumn: direction.cell.column,
            }}
          >
            {/* 0度は画面の下なので、下向きの矢印をそのまま回す */}
            <ArrowDown
              size={16}
              aria-hidden
              style={{ transform: `rotate(${direction.screenAngle}deg)` }}
            />
          </ContextMenuRadioItem>
        );
      })}
      {/* 真ん中は本人の居る升。押せるものではないので印だけ置く */}
      <span
        aria-hidden
        className="col-start-2 row-start-2 m-auto h-2 w-2 rounded-full bg-fg-muted"
      />
    </ContextMenuRadioGroup>
  );
}
