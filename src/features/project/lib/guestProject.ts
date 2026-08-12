import { DANCER_COLOR_PALETTE } from "@/features/dancer/constants";
import type { Project } from "@/features/project/types";
import type { Dancer } from "@/features/dancer/types";
import type { Position, Scene } from "@/features/scene/types";
import { randomId } from "@/lib/randomId";
import { DEFAULT_SEGMENT_SECONDS } from "@/features/scene/lib/sceneTiming";

/** プロジェクト1件ぶんの中身をまとめたもの。ゲストの下書きを作るときも、
 * それをクラウドへ保存するときも、この形で受け渡しする */
export type ProjectSnapshot = {
  project: Project;
  dancers: Dancer[];
  scenes: Scene[];
  positions: Position[];
};

/** DBのdefaultと同じ(migration 0002)。ゲストの下書きでも同じ広さにしておく */
const STAGE_WIDTH = 14;
const STAGE_HEIGHT = 10;

/**
 * 種のIDは固定値にしてある。
 *
 * ここで`crypto.randomUUID()`を使うと、サーバーで描いたHTMLとブラウザで
 * 描いた結果でIDが食い違い、Reactのハイドレーションが警告を出しうる。
 * ゲストの下書きはブラウザの中だけの存在なので、IDが毎回同じでも困らない。
 *
 * クラウドへ保存する時点で `withFreshIds()` が全部を採り直すため、
 * 「2回保存したら主キーが衝突する」ということも起きない。
 */
const SEED_IDS = {
  project: "00000000-0000-4000-8000-000000000001",
  scenes: [
    "00000000-0000-4000-8000-000000000011",
    "00000000-0000-4000-8000-000000000012",
  ],
  dancers: [
    "00000000-0000-4000-8000-000000000021",
    "00000000-0000-4000-8000-000000000022",
    "00000000-0000-4000-8000-000000000023",
    "00000000-0000-4000-8000-000000000024",
  ],
};

/** シーン1=横1列、シーン2=ダイヤ。格子スナップに合わせて整数で置く。
 * yが小さいほどバックステージ(奥)、大きいほど客席側(手前) */
const SEED_LAYOUT: [number, number][][] = [
  [
    [4, 6],
    [6, 6],
    [8, 6],
    [10, 6],
  ],
  [
    [7, 3],
    [4, 5],
    [10, 5],
    [7, 7],
  ],
];

/**
 * 未ログインでも触れる「はじめからある下書き」を作る。
 *
 * 空のステージから始めないのは、このアプリの価値が
 * 「シーンを切り替えると人が動く」ところにあるから。1シーンだけ・0人だと
 * 再生ボタンを押しても何も起きず、何のアプリか分からないまま離脱してしまう。
 * 4人・2シーンあれば、開いた直後に再生してフォーメーションの移動が見える。
 *
 * 中身はあくまで叩き台なので、ダンサーもシーンも自由に消して作り直せる。
 */
export function createGuestProject(
  now = "1970-01-01T00:00:00.000Z",
): ProjectSnapshot {
  const project: Project = {
    id: SEED_IDS.project,
    // 保存するまで持ち主は決まらない。保存時にログインしたユーザーを入れる
    userId: "",
    title: "はじめてのフォーメーション",
    stageWidth: STAGE_WIDTH,
    stageHeight: STAGE_HEIGHT,
    // 曲はまだ選ばれていないので頭出しも無い(DBのdefaultと同じ0)
    musicOffsetSeconds: 0,
    createdAt: now,
    updatedAt: now,
  };

  const dancers: Dancer[] = SEED_IDS.dancers.map((id, index) => ({
    id,
    projectId: project.id,
    name: String(index + 1),
    color: DANCER_COLOR_PALETTE[index % DANCER_COLOR_PALETTE.length],
    initialDirection: 0,
    createdAt: now,
  }));

  const scenes: Scene[] = SEED_IDS.scenes.map((id, index) => ({
    id,
    projectId: project.id,
    name: `シーン${index + 1}`,
    orderIndex: index,
    // 1秒おきに並べた種。時刻は絶対値で持つ
    timeSeconds: index * DEFAULT_SEGMENT_SECONDS,
  }));

  const positions: Position[] = scenes.flatMap((scene, sceneIndex) =>
    dancers.map((dancer, dancerIndex) => {
      const [x, y] = SEED_LAYOUT[sceneIndex][dancerIndex];
      return {
        sceneId: scene.id,
        dancerId: dancer.id,
        xCoordinate: x,
        yCoordinate: y,
        rotationAngle: 0,
      };
    }),
  );

  return { project, dancers, scenes, positions };
}

/**
 * スナップショットのIDを全て採り直し、持ち主を差し替える。
 *
 * ゲストの下書きは固定IDで始まるので、そのままINSERTすると2人目以降
 * (あるいは同じ人の2回目)で主キーが衝突する。保存の直前に採り直すことで、
 * 「下書き中はIDが安定していて扱いやすい」と「保存後は必ず一意」を両立させる。
 *
 * positionsは(scene_id, dancer_id)の組で参照しているため、対応表を作って
 * 貼り替える。ここを取りこぼすと外部キー違反になる。
 */
export function withFreshIds(
  snapshot: ProjectSnapshot,
  userId: string,
  createId: () => string = randomId,
): ProjectSnapshot {
  const projectId = createId();
  const sceneIdByOld = new Map(
    snapshot.scenes.map((scene) => [scene.id, createId()]),
  );
  const dancerIdByOld = new Map(
    snapshot.dancers.map((dancer) => [dancer.id, createId()]),
  );

  return {
    project: { ...snapshot.project, id: projectId, userId },
    dancers: snapshot.dancers.map((dancer) => ({
      ...dancer,
      id: dancerIdByOld.get(dancer.id)!,
      projectId,
    })),
    scenes: snapshot.scenes.map((scene) => ({
      ...scene,
      id: sceneIdByOld.get(scene.id)!,
      projectId,
    })),
    // 参照先が見つからないpositionは捨てる(ダンサーを消した直後などに
    // 取り残しがあっても、外部キー違反で保存全体を失敗させないため)
    positions: snapshot.positions.flatMap((position) => {
      const sceneId = sceneIdByOld.get(position.sceneId);
      const dancerId = dancerIdByOld.get(position.dancerId);
      if (!sceneId || !dancerId) return [];
      return [{ ...position, sceneId, dancerId }];
    }),
  };
}
