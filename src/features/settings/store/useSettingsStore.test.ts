import { beforeEach, describe, expect, it } from "vitest";
import { GUEST_SCOPE, useSettingsStore } from "./useSettingsStore";
import {
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  parseStoredSettings,
} from "@/features/settings/lib/settings";

/**
 * 効く範囲は2段。
 *
 *   ホーム(scope = null)   … 土台。すべての作品に効く
 *   作品を開いている        … その作品だけの上書き
 *
 * **読む側(34箇所)は解決済みの値をトップレベルから読むだけ**なので、
 * ここが正しければ画面の側は何も知らなくてよい。逆にここが崩れると
 * 全部の画面が静かに間違う。
 */
function reset() {
  localStorage.clear();
  useSettingsStore.setState({
    ...DEFAULT_SETTINGS,
    base: DEFAULT_SETTINGS,
    byProject: {},
    scope: null,
    isLoaded: false,
  });
}

beforeEach(reset);

describe("useSettingsStore の効く範囲", () => {
  it("ホームで変えると土台が動き、どの作品でもその値になる", () => {
    const { update, setScope } = useSettingsStore.getState();

    update("isSnapEnabled", false);
    expect(useSettingsStore.getState().isSnapEnabled).toBe(false);

    setScope("project-1");
    expect(useSettingsStore.getState().isSnapEnabled).toBe(false);
    setScope("project-2");
    expect(useSettingsStore.getState().isSnapEnabled).toBe(false);
  });

  it("作品を開いて変えると、その作品だけが変わる", () => {
    const { setScope, update } = useSettingsStore.getState();

    setScope("project-1");
    update("isSnapEnabled", false);
    expect(useSettingsStore.getState().isSnapEnabled).toBe(false);

    // 別の作品と、ホームは土台のまま
    setScope("project-2");
    expect(useSettingsStore.getState().isSnapEnabled).toBe(true);
    setScope(null);
    expect(useSettingsStore.getState().isSnapEnabled).toBe(true);

    // 戻れば、その作品の値が返ってくる
    setScope("project-1");
    expect(useSettingsStore.getState().isSnapEnabled).toBe(false);
  });

  /**
   * 上書きは「触った項目だけ」。全項目を丸ごと持たせると、ホームで変えた
   * 設定が、一度でも開いた作品には二度と届かなくなる。
   */
  it("作品の上書きは、触った項目だけ。ほかは土台に従う", () => {
    const store = useSettingsStore.getState();

    store.setScope("project-1");
    store.update("isSnapEnabled", false);

    store.setScope(null);
    store.update("isCenterLineVisible", false);

    store.setScope("project-1");
    const state = useSettingsStore.getState();
    expect(state.isSnapEnabled).toBe(false); // その作品の値
    expect(state.isCenterLineVisible).toBe(false); // 土台から届く
  });

  /**
   * 曲の速さの初期値は「新しく作るときの値」で、既にある作品には
   * 元から効かない。作品ごとに持たせると、効かない値を作品ごとに
   * 抱えることになる。
   *
   * （ステージの広さも同じ仲間だったが、作るときの板でその場で決める
   * 形にしたので、設定から外した。2026-08-20）
   */
  it("新しく作るときの初期値は、作品を開いていても土台へ書く", () => {
    const { setScope, update } = useSettingsStore.getState();

    setScope("project-1");
    update("defaultBpm", 132);

    expect(useSettingsStore.getState().byProject["project-1"]).toBeUndefined();
    expect(useSettingsStore.getState().base.defaultBpm).toBe(132);

    setScope(null);
    expect(useSettingsStore.getState().defaultBpm).toBe(132);
  });

  it("自動保存も土台へ書く。作品ごとに変わると保存の挙動が読めなくなる", () => {
    const { setScope, update } = useSettingsStore.getState();

    setScope("project-1");
    update("isAutoSaveEnabled", false);

    expect(useSettingsStore.getState().byProject["project-1"]).toBeUndefined();
    expect(useSettingsStore.getState().base.isAutoSaveEnabled).toBe(false);
  });

  it("下書き(ゲスト)にも自分の範囲がある", () => {
    const { setScope, update } = useSettingsStore.getState();

    setScope(GUEST_SCOPE);
    update("countIn", 4);

    setScope("project-1");
    expect(useSettingsStore.getState().countIn).toBe(0);
    setScope(GUEST_SCOPE);
    expect(useSettingsStore.getState().countIn).toBe(4);
  });

  it("この作品だけの設定をやめると、土台へ戻る", () => {
    const store = useSettingsStore.getState();

    store.setScope("project-1");
    store.update("isSnapEnabled", false);
    store.update("countIn", 8);
    expect(useSettingsStore.getState().hasOverride("countIn")).toBe(true);

    useSettingsStore.getState().clearOverrides();

    const state = useSettingsStore.getState();
    expect(state.isSnapEnabled).toBe(true);
    expect(state.countIn).toBe(0);
    expect(state.byProject["project-1"]).toBeUndefined();
    expect(state.hasOverride("countIn")).toBe(false);
  });

  it("端末へ書いたものを読み直しても、範囲ごと戻る", () => {
    const store = useSettingsStore.getState();
    store.setScope("project-1");
    store.update("countIn", 8);
    store.setScope(null);
    store.update("isSnapEnabled", false);

    // 別のタブで開き直したのと同じ状態にする
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    const stored = parseStoredSettings(raw);

    expect(stored.base.isSnapEnabled).toBe(false);
    expect(stored.byProject["project-1"]).toEqual({ countIn: 8 });
  });

  it("読み込みは、いま開いている作品の値で始まる", () => {
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        base: { ...DEFAULT_SETTINGS, countIn: 4 },
        byProject: { "project-1": { countIn: 8 } },
      }),
    );

    useSettingsStore.setState({ scope: "project-1" });
    useSettingsStore.getState().load();

    expect(useSettingsStore.getState().countIn).toBe(8);
    expect(useSettingsStore.getState().base.countIn).toBe(4);
  });
});
