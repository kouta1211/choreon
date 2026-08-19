import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ViewerViewMenu } from "./ViewerViewMenu";
import { useSettingsStore } from "@/features/settings/store/useSettingsStore";

async function open() {
  const user = userEvent.setup();
  render(<ViewerViewMenu />);
  await user.click(screen.getByLabelText("表示を変える"));
  return user;
}

describe("ViewerViewMenu", () => {
  it("見る人に意味のある3つだけを出す", async () => {
    await open();

    expect(screen.getByText("名前を出す")).toBeInTheDocument();
    expect(screen.getByText("センターラインを強調")).toBeInTheDocument();
    expect(screen.getByText("客席を上にする")).toBeInTheDocument();
  });

  /* 作る側の道具は出さない。切っても見る人には意味が無く、
     「効かないつまみ」が並ぶことになる */
  it("作る側の道具は出さない", async () => {
    await open();

    expect(screen.queryByText("格子に吸着させる")).toBeNull();
    expect(screen.queryByText("顔被りチェック")).toBeNull();
  });

  it("名前を切ると、端末の設定に残る", async () => {
    useSettingsStore.setState({ dancerNameDisplay: "always" });
    const user = await open();

    await user.click(screen.getByText("名前を出す"));

    expect(useSettingsStore.getState().dancerNameDisplay).toBe("never");
  });

  it("押しても閉じない（続けて2つ3つ触る場所なので）", async () => {
    const user = await open();

    await user.click(screen.getByText("センターラインを強調"));

    expect(screen.getByText("客席を上にする")).toBeInTheDocument();
  });
});
