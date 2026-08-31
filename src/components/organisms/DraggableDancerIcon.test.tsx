import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useMotionValue } from "motion/react";
import { GroupDragProvider } from "@/features/canvas/hooks/useGroupDrag";
import { DraggableDancerIcon } from "./DraggableDancerIcon";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useSettingsStore } from "@/features/settings/store/useSettingsStore";

import { makeDancer } from "@/test/factories";

// 本番のCanvasBoardと同じsensor設定(8px未満の移動はクリック扱い)。
// デフォルトのDndContextには無いので、テストでも明示的に合わせないと
// クリックがドラッグ開始とみなされてonClickが発火しない
function DndTestWrapper({ children }: { children: ReactNode }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );
  return <DndContext sensors={sensors}>{children}</DndContext>;
}

describe("客席を上にする設定", () => {
  afterEach(() => {
    useSettingsStore.setState({ isAudienceOnTop: false });
  });

  it("既定では、奥(y=2)は画面の上に置かれる", () => {
    render(
      <DndContext>
        <DraggableDancerIcon
          dancer={makeDancer()}
          x={4}
          y={2}
          rotationAngle={0}
          stageWidthUnits={8}
          stageHeightUnits={8}
        />
      </DndContext>,
    );
    expect(screen.getByTestId("dancer-icon")).toHaveStyle({ top: "25%" });
  });

  it("客席を上にすると、同じ立ち位置が画面の下へ回る(保存する値は変えない)", () => {
    useSettingsStore.setState({ isAudienceOnTop: true });
    render(
      <DndContext>
        <DraggableDancerIcon
          dancer={makeDancer()}
          x={4}
          y={2}
          rotationAngle={0}
          stageWidthUnits={8}
          stageHeightUnits={8}
        />
      </DndContext>,
    );
    // y=2 は上下を写して 8-2=6 → 75%
    expect(screen.getByTestId("dancer-icon")).toHaveStyle({ top: "75%" });
  });

  // 向き(鼻先)の写しは mirrorAngle が受け持っていて、そちらで
  // 単体テストしてある(features/canvas/lib/stageFlip.test.ts)
});

describe("DraggableDancerIcon", () => {
  /**
   * **止まっている人の名前は、ここでは描かない**（2026-08-31）。
   * 1人ずつの中に描くと、**隣の人の丸に隠れる** — ダンサーは motion が
   * transform を当てるので1人ずつが独立した重なりの単位になり、
   * z-index では越えられないため。止まっている人の名前は
   * DancerNamesOverlay が丸より上の層でまとめて描く
   * （出ることは DancerLayer.test.tsx が縛っている）。
   *
   * ここが描くのは掴んで動いている最中だけ。掴んだ人には z-10 が付くので、
   * その間は中に描いても上に出る。
   */
  it("止まっている間は、名前をここでは描かない（上の層が描く）", () => {
    render(
      <DndContext>
        <DraggableDancerIcon
          dancer={makeDancer({ name: "あいり" })}
          x={4}
          y={4}
          rotationAngle={0}
          stageWidthUnits={8}
          stageHeightUnits={8}
        />
      </DndContext>,
    );
    expect(screen.queryByText("あいり")).toBeNull();
  });

  it("dnd-kitのドラッグ用属性が付与される", () => {
    render(
      <DndContext>
        <DraggableDancerIcon
          dancer={makeDancer()}
          x={2}
          y={2}
          rotationAngle={0}
          stageWidthUnits={8}
          stageHeightUnits={8}
        />
      </DndContext>,
    );
    const icon = screen.getByTestId("dancer-icon");
    expect(icon).toHaveAttribute("aria-roledescription", "draggable");
  });

  it("クリックすると選択状態になる", async () => {
    const user = userEvent.setup();
    render(
      <DndTestWrapper>
        <DraggableDancerIcon
          dancer={makeDancer()}
          x={2}
          y={2}
          rotationAngle={0}
          stageWidthUnits={8}
          stageHeightUnits={8}
        />
      </DndTestWrapper>,
    );

    await user.click(screen.getByTestId("dancer-icon"));

    expect(useUIStore.getState().selectedDancerIds).toEqual(["dancer-1"]);
  });

  /* 隊形は塊で動かすので、選びに足せる必要がある（2026-08-18、PC 特化）。
     指しか無い画面では修飾キーが押せないので、そちらは1人ずつのまま */
  it("Shift を押しながらだと、選びに足す", async () => {
    const user = userEvent.setup();
    useUIStore.setState({ selectedDancerIds: ["dancer-0"] });
    render(
      <DndTestWrapper>
        <DraggableDancerIcon
          dancer={makeDancer()}
          x={2}
          y={2}
          rotationAngle={0}
          stageWidthUnits={8}
          stageHeightUnits={8}
        />
      </DndTestWrapper>,
    );

    await user.keyboard("{Shift>}");
    await user.click(screen.getByTestId("dancer-icon"));
    await user.keyboard("{/Shift}");

    expect(useUIStore.getState().selectedDancerIds).toEqual([
      "dancer-0",
      "dancer-1",
    ]);
  });

  it("Shift を押しながらもう一度押すと、選びから外れる", async () => {
    const user = userEvent.setup();
    useUIStore.setState({ selectedDancerIds: ["dancer-0", "dancer-1"] });
    render(
      <DndTestWrapper>
        <DraggableDancerIcon
          dancer={makeDancer()}
          x={2}
          y={2}
          rotationAngle={0}
          stageWidthUnits={8}
          stageHeightUnits={8}
        />
      </DndTestWrapper>,
    );

    await user.keyboard("{Shift>}");
    await user.click(screen.getByTestId("dancer-icon"));
    await user.keyboard("{/Shift}");

    expect(useUIStore.getState().selectedDancerIds).toEqual(["dancer-0"]);
  });

  it("選択中はマーカーにリングが付く", () => {
    useUIStore.setState({ selectedDancerIds: ["dancer-1"] });
    render(
      <DndContext>
        <DraggableDancerIcon
          dancer={makeDancer()}
          x={2}
          y={2}
          rotationAngle={0}
          stageWidthUnits={8}
          stageHeightUnits={8}
        />
      </DndContext>,
    );

    expect(screen.getByTestId("dancer-selection-ring")).toBeInTheDocument();
  });

  it("フォーカス中のダンサーには強調リングが付く", () => {
    useUIStore.setState({ focusedDancerId: "dancer-1" });
    render(
      <DndContext>
        <DraggableDancerIcon
          dancer={makeDancer()}
          x={2}
          y={2}
          rotationAngle={0}
          stageWidthUnits={8}
          stageHeightUnits={8}
        />
      </DndContext>,
    );

    /* 輪は出さない（周りが隠れるため）。見分けは「他の人が薄くなる」方
       — その薄さは DancerLayer が配るので、ここでは輪が無いことだけ見る */
    expect(screen.queryByTestId("dancer-focus-ring")).toBeNull();
  });

  it("マウスを乗せるとリングが付き、離すと消える", () => {
    render(
      <DndContext>
        <DraggableDancerIcon
          dancer={makeDancer()}
          x={2}
          y={2}
          rotationAngle={0}
          stageWidthUnits={8}
          stageHeightUnits={8}
        />
      </DndContext>,
    );
    const icon = screen.getByTestId("dancer-icon");

    fireEvent.pointerEnter(icon, { pointerType: "mouse" });
    expect(screen.getByTestId("dancer-hover-ring")).toBeInTheDocument();

    fireEvent.pointerLeave(icon);
    expect(screen.queryByTestId("dancer-hover-ring")).not.toBeInTheDocument();
  });

  // リグレッションテスト:
  // タッチでも pointerenter は飛ぶ。素通しにすると、スマートフォンで一度
  // 触ったダンサーがホバーしたまま貼り付き、指を離しても元に戻らない
  // (タッチには「乗せているだけ」という状態が無いので、離れる合図も来ない)
  it("指で触れただけではホバー扱いにしない", () => {
    render(
      <DndContext>
        <DraggableDancerIcon
          dancer={makeDancer()}
          x={2}
          y={2}
          rotationAngle={0}
          stageWidthUnits={8}
          stageHeightUnits={8}
        />
      </DndContext>,
    );

    fireEvent.pointerEnter(screen.getByTestId("dancer-icon"), {
      pointerType: "touch",
    });

    expect(screen.queryByTestId("dancer-hover-ring")).not.toBeInTheDocument();
  });

  // 選択リングと同じ場所に2本重なると、どちらが何なのか分からなくなる
  it("選択中はホバーのリングを重ねない", () => {
    useUIStore.setState({ selectedDancerIds: ["dancer-1"] });
    render(
      <DndContext>
        <DraggableDancerIcon
          dancer={makeDancer()}
          x={2}
          y={2}
          rotationAngle={0}
          stageWidthUnits={8}
          stageHeightUnits={8}
        />
      </DndContext>,
    );

    fireEvent.pointerEnter(screen.getByTestId("dancer-icon"), {
      pointerType: "mouse",
    });

    expect(screen.queryByTestId("dancer-hover-ring")).not.toBeInTheDocument();
    expect(screen.getByTestId("dancer-selection-ring")).toBeInTheDocument();
  });

  it("他のダンサーがフォーカス中のとき、自分は薄く表示される", async () => {
    useUIStore.setState({ focusedDancerId: "someone-else" });
    render(
      <DndContext>
        <DraggableDancerIcon
          dancer={makeDancer()}
          x={2}
          y={2}
          rotationAngle={0}
          stageWidthUnits={8}
          stageHeightUnits={8}
        />
      </DndContext>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("dancer-icon").style.opacity).toBe("0.3");
    });
  });

  it("選択中は回転ハンドルが表示され、確定時にonRotateEndが呼ばれる", async () => {
    useUIStore.setState({ selectedDancerIds: ["dancer-1"] });
    const handleRotateEnd = vi.fn();
    render(
      <DndContext>
        <DraggableDancerIcon
          dancer={makeDancer()}
          x={2}
          y={2}
          rotationAngle={0}
          stageWidthUnits={8}
          stageHeightUnits={8}
          onRotateEnd={handleRotateEnd}
        />
      </DndContext>,
    );

    const handle = screen.getByRole("slider", { name: "向きを変更" });
    expect(handle).toBeInTheDocument();

    handle.setPointerCapture = vi.fn();
    handle.hasPointerCapture = vi.fn().mockReturnValue(true);
    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 0, clientY: 0 });
    fireEvent.pointerUp(handle, { pointerId: 1, clientX: 100, clientY: 0 });

    expect(handleRotateEnd).toHaveBeenCalledWith(
      "dancer-1",
      expect.any(Number),
    );
  });
});

/**
 * **一度でも「一緒に動いた」人が、その後もう掴めなくなる**
 * （実機の報告 2026-08-25:「たまにドラッグにダンサーがついてこない」）。
 *
 * 追随している間の style は x/y（MotionValue）、自分が掴まれている間の
 * style は transform（dnd-kit の文字列）で、**形が入れ替わっていた**。
 * motion は要素ごとに renderState を持ち回っていて、x/y が外れた時点で
 * `transform: none` を書き戻す（motion-dom の buildHTMLStyles）。
 * その書き戻しは毎レンダー走る（scheduleRenderMicrotask）ので、
 * 掴んでいる間じゅう dnd-kit の translate3d が打ち消される。
 *
 * だからここは【追随 → 離す → 自分を掴む】の順で通す。
 * 追随を挟まずに掴むだけでは、この壊れ方は出ない。
 */
describe("一緒に動いたあとで、自分を掴む", () => {
  function FollowThenGrab() {
    const sensors = useSensors(
      useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    );
    const offsetX = useMotionValue(0);
    const offsetY = useMotionValue(0);
    return (
      <DndContext
        sensors={sensors}
        onDragMove={(event) => {
          offsetX.set(event.delta.x);
          offsetY.set(event.delta.y);
        }}
        onDragEnd={() => {
          offsetX.set(0);
          offsetY.set(0);
        }}
      >
        <GroupDragProvider
          activeDancerId={null}
          offsetX={offsetX}
          offsetY={offsetY}
        >
          <Leader />
          <DraggableDancerIcon
            dancer={makeDancer({ id: "付いていく人" })}
            x={4}
            y={4}
            rotationAngle={0}
            stageWidthUnits={8}
            stageHeightUnits={8}
          />
        </GroupDragProvider>
      </DndContext>
    );
  }

  /** 先に掴まれる側。この人に付いて「付いていく人」が動く */
  function Leader() {
    const { setNodeRef, listeners, attributes } = useDraggable({
      id: "掴む人",
    });
    return (
      <div ref={setNodeRef} data-testid="leader" {...listeners} {...attributes} />
    );
  }

  function drag(element: HTMLElement, dx: number, dy: number) {
    const pointer = { pointerId: 1, isPrimary: true, button: 0 };
    fireEvent.pointerDown(element, { ...pointer, clientX: 100, clientY: 100 });
    // 1回目は「掴んだ」判定に使われるので、2回動かす
    for (let i = 0; i < 2; i += 1) {
      fireEvent.pointerMove(document, {
        ...pointer,
        clientX: 100 + dx,
        clientY: 100 + dy,
      });
    }
  }

  /** motion は描き直しを **microtask** で予約する（scheduleRenderMicrotask）。
   *  `waitFor` は act() で包んでその前に読んでしまい、**壊れていても緑になる**。
   *  実機と同じ順序で見るために、マクロタスクを1回挟んでから読む */
  async function afterMotionRender() {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  it("追随したあとでも、自分を掴めば指に付いてくる", async () => {
    useUIStore.setState({ selectedDancerIds: ["掴む人", "付いていく人"] });
    render(<FollowThenGrab />);
    const icon = screen.getByTestId("dancer-icon");

    // (1) 掴む人に付いて一緒に動き、離す
    drag(screen.getByTestId("leader"), 40, 20);
    await afterMotionRender();
    expect(icon.style.transform).toMatch(/40px/);
    fireEvent.pointerUp(document, { pointerId: 1 });
    await afterMotionRender();

    // (2) 今度は自分を掴む
    drag(icon, 60, 30);
    await afterMotionRender();

    // 壊れているときは、motion が transform を "none" で塗り潰して止まる
    expect(icon.style.transform).not.toBe("none");
    expect(icon.style.transform).toMatch(/60px/);
  });
});
