import { describe, expect, it } from "vitest";
import { createGuestProject, withFreshIds } from "./guestProject";

describe("createGuestProject", () => {
  it("開いた直後から再生できるだけの中身がある(2シーン・4人)", () => {
    const snapshot = createGuestProject();
    expect(snapshot.scenes).toHaveLength(2);
    expect(snapshot.dancers).toHaveLength(4);
    // 全シーン×全員ぶんの配置が揃っていないと、移動アニメーションが欠ける
    expect(snapshot.positions).toHaveLength(8);
  });

  it("2つのシーンで配置が違う(再生して動きが見える)", () => {
    const { scenes, positions } = createGuestProject();
    const first = positions.filter((p) => p.sceneId === scenes[0].id);
    const second = positions.filter((p) => p.sceneId === scenes[1].id);
    const key = (list: typeof first) =>
      list
        .map((p) => `${p.dancerId}:${p.xCoordinate},${p.yCoordinate}`)
        .sort()
        .join("|");
    expect(key(first)).not.toBe(key(second));
  });

  it("配置はすべてステージの内側にある", () => {
    const { project, positions } = createGuestProject();
    for (const position of positions) {
      expect(position.xCoordinate).toBeGreaterThanOrEqual(0);
      expect(position.xCoordinate).toBeLessThanOrEqual(project.stageWidth);
      expect(position.yCoordinate).toBeGreaterThanOrEqual(0);
      expect(position.yCoordinate).toBeLessThanOrEqual(project.stageHeight);
    }
  });

  it("色が重複していない", () => {
    const { dancers } = createGuestProject();
    expect(new Set(dancers.map((d) => d.color)).size).toBe(dancers.length);
  });

  it("何度呼んでも同じIDになる(サーバー描画とブラウザ描画で食い違わない)", () => {
    expect(createGuestProject().project.id).toBe(
      createGuestProject().project.id,
    );
  });
});

describe("withFreshIds", () => {
  function fakeIds() {
    let n = 0;
    return () => `id-${++n}`;
  }

  it("すべてのIDを採り直し、持ち主を入れる", () => {
    const snapshot = createGuestProject();
    const fresh = withFreshIds(snapshot, "user-1", fakeIds());

    expect(fresh.project.userId).toBe("user-1");
    expect(fresh.project.id).not.toBe(snapshot.project.id);
    for (const scene of fresh.scenes) {
      expect(scene.projectId).toBe(fresh.project.id);
    }
    for (const dancer of fresh.dancers) {
      expect(dancer.projectId).toBe(fresh.project.id);
    }
  });

  it("positionsの参照先を新しいIDへ貼り替える", () => {
    const snapshot = createGuestProject();
    const fresh = withFreshIds(snapshot, "user-1", fakeIds());

    const sceneIds = new Set(fresh.scenes.map((s) => s.id));
    const dancerIds = new Set(fresh.dancers.map((d) => d.id));
    expect(fresh.positions).toHaveLength(snapshot.positions.length);
    for (const position of fresh.positions) {
      expect(sceneIds.has(position.sceneId)).toBe(true);
      expect(dancerIds.has(position.dancerId)).toBe(true);
    }
  });

  it("2回保存しても同じIDにならない", () => {
    const snapshot = createGuestProject();
    const a = withFreshIds(snapshot, "user-1");
    const b = withFreshIds(snapshot, "user-1");
    expect(a.project.id).not.toBe(b.project.id);
  });

  it("参照先を失ったpositionは落とす(外部キー違反で全体を失敗させない)", () => {
    const snapshot = createGuestProject();
    const orphan = {
      ...snapshot.positions[0],
      dancerId: "消えたダンサー",
    };
    const fresh = withFreshIds(
      { ...snapshot, positions: [...snapshot.positions, orphan] },
      "user-1",
      fakeIds(),
    );
    expect(fresh.positions).toHaveLength(snapshot.positions.length);
  });

  it("名前・秒数・座標などの中身は変えない", () => {
    const snapshot = createGuestProject();
    const fresh = withFreshIds(snapshot, "user-1", fakeIds());
    expect(fresh.project.title).toBe(snapshot.project.title);
    expect(fresh.scenes.map((s) => s.name)).toEqual(
      snapshot.scenes.map((s) => s.name),
    );
    expect(fresh.positions.map((p) => p.xCoordinate)).toEqual(
      snapshot.positions.map((p) => p.xCoordinate),
    );
  });
});
