/**
 * フォーメーションのテンプレート(既成の隊形)。
 *
 * 座標はすべて【8×6マス基準】の相対値で持ち、実際のステージへは
 * x * (stageWidth/8), y * (stageHeight/6) で比例配置する。
 * こうしておけば、プロジェクトごとにステージの広さが違っても
 * 同じ形が同じ見え方で出せる。
 *
 * 規約: 上=バックステージ=「後」、下=客席側=「前」。
 * 名前の数字は後→前の順(「後1-2-2前」なら奥から1人・2人・2人)。
 */

export type FormationPoint = { x: number; y: number };

export type FormationTemplate = {
  name: string;
  count: number;
  /** 8×6マス基準の座標 */
  points: FormationPoint[];
};

/** テンプレート座標が前提にしているマス数 */
const BASE_WIDTH = 8;
const BASE_HEIGHT = 6;

function template(
  name: string,
  points: [number, number][],
): FormationTemplate {
  return {
    name,
    count: points.length,
    points: points.map(([x, y]) => ({ x, y })),
  };
}

/**
 * 全59種(2〜10人)。似た形は機械的に落としてある。
 * 判定は「各点を1対1に対応づけたときの平均距離が0.9ユニット(約80cm)未満なら
 * 同じ形」。新しい形を足すときも同じ基準で重複を確認する。
 *
 * 系統: 横1列 / 2列 / 千鳥 / V字 / 逆V / 弧 / 円 / 縦列 / 斜め / ジグザグ / L字
 */
export const FORMATION_TEMPLATES: FormationTemplate[] = [
  // --- 2人(5種) ---
  template("横並び", [
    [2.6, 3],
    [5.4, 3],
  ]),
  template("縦1列（前後）", [
    [4, 1.6],
    [4, 4.4],
  ]),
  template("斜め", [
    [2.2, 1.6],
    [5.8, 4.4],
  ]),
  template("前寄せ横並び", [
    [2.6, 4.8],
    [5.4, 4.8],
  ]),
  template("奥寄せ横並び", [
    [2.6, 1.2],
    [5.4, 1.2],
  ]),

  // --- 3人(6種) ---
  template("横1列", [
    [1.6, 3],
    [4, 3],
    [6.4, 3],
  ]),
  template("三角（後1・前2）", [
    [4, 1.2],
    [2.2, 4.4],
    [5.8, 4.4],
  ]),
  template("逆三角（後2・前1）", [
    [2.2, 1.4],
    [5.8, 1.4],
    [4, 4.6],
  ]),
  template("縦1列", [
    [4, 1.2],
    [4, 3],
    [4, 4.8],
  ]),
  template("斜め列", [
    [1.6, 1.2],
    [4, 3],
    [6.4, 4.8],
  ]),
  template("L字", [
    [1.6, 1.4],
    [1.6, 4.6],
    [5, 4.6],
  ]),

  // --- 4人(7種) ---
  template("横1列", [
    [1.4, 3],
    [3.1, 3],
    [4.9, 3],
    [6.6, 3],
  ]),
  template("2列（2-2）", [
    [2.4, 1.6],
    [5.6, 1.6],
    [2.4, 4.4],
    [5.6, 4.4],
  ]),
  template("ダイヤ", [
    [4, 1],
    [2, 3],
    [6, 3],
    [4, 5],
  ]),
  template("ハの字（後狭・前広）", [
    [3.2, 1.4],
    [4.8, 1.4],
    [1.2, 4.8],
    [6.8, 4.8],
  ]),
  template("くさび（後広・前狭）", [
    [1.2, 1.4],
    [6.8, 1.4],
    [3.2, 4.8],
    [4.8, 4.8],
  ]),
  template("縦1列", [
    [4, 1.2],
    [4, 2.6],
    [4, 4],
    [4, 5.4],
  ]),
  template("斜め列", [
    [1.2, 1],
    [2.8, 2.3],
    [4.4, 3.6],
    [6.4, 5],
  ]),

  // --- 5人(7種) ---
  template("横1列", [
    [1.2, 3],
    [2.6, 3],
    [4, 3],
    [5.4, 3],
    [6.8, 3],
  ]),
  template("V字（後1-2-2前）", [
    [4, 0.9],
    [2.4, 2.7],
    [5.6, 2.7],
    [1, 4.9],
    [7, 4.9],
  ]),
  template("逆V字（後2-2-1前）", [
    [1, 1.1],
    [7, 1.1],
    [2.4, 3.3],
    [5.6, 3.3],
    [4, 5.1],
  ]),
  template("縦1列", [
    [4, 1],
    [4, 2.1],
    [4, 3.2],
    [4, 4.3],
    [4, 5.4],
  ]),
  template("2列（2-3）", [
    [2.6, 1.4],
    [5.4, 1.4],
    [1.4, 4.6],
    [4, 4.6],
    [6.6, 4.6],
  ]),
  template("W字（ジグザグ）", [
    [1.2, 1.2],
    [2.6, 4.8],
    [4, 1.2],
    [5.4, 4.8],
    [6.8, 1.2],
  ]),
  template("L字", [
    [1.4, 1.2],
    [1.4, 3],
    [1.4, 4.8],
    [3.6, 4.8],
    [5.8, 4.8],
  ]),

  // --- 6人(8種) ---
  template("横1列", [
    [1, 3],
    [2.24, 3],
    [3.48, 3],
    [4.72, 3],
    [5.96, 3],
    [7.2, 3],
  ]),
  template("2列（3-3）", [
    [1.8, 1.5],
    [4, 1.5],
    [6.2, 1.5],
    [1.8, 4.5],
    [4, 4.5],
    [6.2, 4.5],
  ]),
  template("千鳥（3-3）", [
    [1.2, 1.5],
    [3.4, 1.5],
    [5.6, 1.5],
    [2.4, 4.5],
    [4.6, 4.5],
    [6.8, 4.5],
  ]),
  template("V字（後1-2-3前）", [
    [4, 0.8],
    [2.4, 2.4],
    [5.6, 2.4],
    [1, 4.9],
    [4, 4.9],
    [7, 4.9],
  ]),
  template("円（サークル）", [
    [4, 0.7],
    [6.9, 2.2],
    [6.9, 3.8],
    [4, 5.3],
    [1.1, 3.8],
    [1.1, 2.2],
  ]),
  template("縦2列（3-3）", [
    [2.8, 1.3],
    [2.8, 3],
    [2.8, 4.7],
    [5.2, 1.3],
    [5.2, 3],
    [5.2, 4.7],
  ]),
  template("斜め列", [
    [0.9, 0.9],
    [2.2, 1.8],
    [3.5, 2.7],
    [4.8, 3.6],
    [6.1, 4.5],
    [7.2, 5.3],
  ]),
  template("W字（ジグザグ）", [
    [0.9, 1.1],
    [2.2, 4.9],
    [3.5, 1.1],
    [4.8, 4.9],
    [6.1, 1.1],
    [7.2, 4.9],
  ]),

  // --- 7人(7種) ---
  template("横1列", [
    [0.9, 3],
    [1.95, 3],
    [3, 3],
    [4.05, 3],
    [5.1, 3],
    [6.15, 3],
    [7.2, 3],
  ]),
  template("2列（3-4）", [
    [2.2, 1.4],
    [4, 1.4],
    [5.8, 1.4],
    [1, 4.6],
    [3, 4.6],
    [5, 4.6],
    [7, 4.6],
  ]),
  template("2列（4-3）", [
    [1, 1.4],
    [3, 1.4],
    [5, 1.4],
    [7, 1.4],
    [2.2, 4.6],
    [4, 4.6],
    [5.8, 4.6],
  ]),
  template("V字（後1-2-4前）", [
    [4, 0.8],
    [2.5, 2.3],
    [5.5, 2.3],
    [1, 4.9],
    [2.9, 4.9],
    [5.1, 4.9],
    [7, 4.9],
  ]),
  template("円＋センター", [
    [4, 3],
    [4, 0.7],
    [6.9, 2.1],
    [6.9, 3.9],
    [4, 5.3],
    [1.1, 3.9],
    [1.1, 2.1],
  ]),
  template("弧（アーチ）", [
    [0.9, 5],
    [2, 3.4],
    [3.2, 2.2],
    [4, 1.8],
    [4.8, 2.2],
    [6, 3.4],
    [7.1, 5],
  ]),
  template("斜め列", [
    [0.9, 0.9],
    [2, 1.6],
    [3.1, 2.4],
    [4.2, 3.2],
    [5.3, 4],
    [6.4, 4.8],
    [7.2, 5.4],
  ]),

  // --- 8人(7種) ---
  template("横1列", [
    [0.8, 3],
    [1.71, 3],
    [2.63, 3],
    [3.54, 3],
    [4.46, 3],
    [5.37, 3],
    [6.29, 3],
    [7.2, 3],
  ]),
  template("2列（4-4）", [
    [1.2, 1.5],
    [3.1, 1.5],
    [4.9, 1.5],
    [6.8, 1.5],
    [1.2, 4.5],
    [3.1, 4.5],
    [4.9, 4.5],
    [6.8, 4.5],
  ]),
  template("千鳥（4-4）", [
    [0.9, 1.5],
    [2.8, 1.5],
    [4.7, 1.5],
    [6.6, 1.5],
    [1.85, 4.5],
    [3.75, 4.5],
    [5.65, 4.5],
    [7.2, 4.5],
  ]),
  template("V字（後1-3-4前）", [
    [4, 0.7],
    [2.3, 2.2],
    [4, 2.2],
    [5.7, 2.2],
    [0.9, 4.9],
    [2.7, 4.9],
    [5.3, 4.9],
    [7.1, 4.9],
  ]),
  template("円（サークル）", [
    [4, 0.7],
    [6.3, 1.5],
    [7, 3],
    [6.3, 4.5],
    [4, 5.3],
    [1.7, 4.5],
    [1, 3],
    [1.7, 1.5],
  ]),
  template("縦2列（4-4）", [
    [2.8, 1.1],
    [2.8, 2.4],
    [2.8, 3.7],
    [2.8, 5],
    [5.2, 1.1],
    [5.2, 2.4],
    [5.2, 3.7],
    [5.2, 5],
  ]),
  template("X字", [
    [0.9, 0.9],
    [7.1, 0.9],
    [2.6, 2.6],
    [5.4, 2.6],
    [2.6, 3.6],
    [5.4, 3.6],
    [0.9, 5.1],
    [7.1, 5.1],
  ]),

  // --- 9人(6種) ---
  template("3×3 グリッド", [
    [1.6, 1.4],
    [4, 1.4],
    [6.4, 1.4],
    [1.6, 3],
    [4, 3],
    [6.4, 3],
    [1.6, 4.6],
    [4, 4.6],
    [6.4, 4.6],
  ]),
  template("横1列", [
    [0.8, 3],
    [1.6, 3],
    [2.4, 3],
    [3.2, 3],
    [4, 3],
    [4.8, 3],
    [5.6, 3],
    [6.4, 3],
    [7.2, 3],
  ]),
  template("V字（後1-3-5前）", [
    [4, 0.7],
    [2.3, 2.3],
    [4, 2.3],
    [5.7, 2.3],
    [0.8, 4.9],
    [2.4, 4.9],
    [4, 4.9],
    [5.6, 4.9],
    [7.2, 4.9],
  ]),
  template("2列（4-5）", [
    [1.4, 1.4],
    [3.1, 1.4],
    [4.9, 1.4],
    [6.6, 1.4],
    [0.8, 4.6],
    [2.4, 4.6],
    [4, 4.6],
    [5.6, 4.6],
    [7.2, 4.6],
  ]),
  template("円＋センター", [
    [4, 3],
    [4, 0.7],
    [6.3, 1.5],
    [7, 3],
    [6.3, 4.5],
    [4, 5.3],
    [1.7, 4.5],
    [1, 3],
    [1.7, 1.5],
  ]),
  template("弧2列（4-5）", [
    [1.2, 2.6],
    [3.1, 1.6],
    [4.9, 1.6],
    [6.8, 2.6],
    [0.9, 5],
    [2.4, 4.1],
    [4, 3.7],
    [5.6, 4.1],
    [7.1, 5],
  ]),

  // --- 10人(6種) ---
  template("2列（5-5）", [
    [0.9, 1.5],
    [2.4, 1.5],
    [4, 1.5],
    [5.6, 1.5],
    [7.1, 1.5],
    [0.9, 4.5],
    [2.4, 4.5],
    [4, 4.5],
    [5.6, 4.5],
    [7.1, 4.5],
  ]),
  template("千鳥（5-5）", [
    [0.8, 1.5],
    [2.3, 1.5],
    [3.8, 1.5],
    [5.3, 1.5],
    [6.8, 1.5],
    [1.5, 4.5],
    [3, 4.5],
    [4.5, 4.5],
    [6, 4.5],
    [7.2, 4.5],
  ]),
  template("横1列", [
    [0.7, 3],
    [1.42, 3],
    [2.14, 3],
    [2.87, 3],
    [3.59, 3],
    [4.31, 3],
    [5.03, 3],
    [5.76, 3],
    [6.48, 3],
    [7.2, 3],
  ]),
  template("V字（後1-2-3-4前）", [
    [4, 0.7],
    [2.8, 1.8],
    [5.2, 1.8],
    [1.8, 3.1],
    [4, 3.1],
    [6.2, 3.1],
    [0.8, 4.9],
    [2.8, 4.9],
    [5.2, 4.9],
    [7.2, 4.9],
  ]),
  template("円（サークル）", [
    [4, 0.6],
    [5.9, 1.1],
    [7.1, 2.3],
    [7.1, 3.7],
    [5.9, 4.9],
    [4, 5.4],
    [2.1, 4.9],
    [0.9, 3.7],
    [0.9, 2.3],
    [2.1, 1.1],
  ]),
  template("縦2列（5-5）", [
    [2.8, 1],
    [2.8, 2.1],
    [2.8, 3.2],
    [2.8, 4.3],
    [2.8, 5.4],
    [5.2, 1],
    [5.2, 2.1],
    [5.2, 3.2],
    [5.2, 4.3],
    [5.2, 5.4],
  ]),
];

/** その人数のテンプレートだけを返す。シートを開いた直後は、いまステージに
 * いる人数のものを出し、人数レールで他の人数へ切り替えられる */
export function templatesForCount(count: number): FormationTemplate[] {
  return FORMATION_TEMPLATES.filter((item) => item.count === count);
}

/** テンプレートが用意されている人数(小さい順) */
export function availableCounts(): number[] {
  return [...new Set(FORMATION_TEMPLATES.map((item) => item.count))].sort(
    (a, b) => a - b,
  );
}

// ---------------------------------------------------------------------------
// 変形
// ---------------------------------------------------------------------------

export type FormationSpacing = "narrow" | "normal" | "wide";

export type FormationTransform = {
  /** 左右反転 */
  flipX: boolean;
  /** 前後反転(バックステージと客席側の入れ替え) */
  flipY: boolean;
  /** 90度回転 */
  rotate: boolean;
  spacing: FormationSpacing;
};

export const DEFAULT_TRANSFORM: FormationTransform = {
  flipX: false,
  flipY: false,
  rotate: false,
  spacing: "normal",
};

const SPACING_SCALE: Record<FormationSpacing, number> = {
  narrow: 0.8,
  normal: 1,
  wide: 1.2,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * テンプレートの点を、変形を適用したうえで実際のステージ座標へ変換する。
 *
 * 回転はステージの中心まわりに行う。8×6を90度回すと縦横が入れ替わって
 * はみ出すため、中心を基準に縮小して収める(はみ出した点を切り捨てると
 * 隊形の形自体が壊れるため、全体を縮める)。
 */
export function resolveFormationPoints(
  points: FormationPoint[],
  transform: FormationTransform,
  stageWidth: number,
  stageHeight: number,
): FormationPoint[] {
  // 1. 8x6基準のまま反転する
  let working = points.map((point) => ({
    x: transform.flipX ? BASE_WIDTH - point.x : point.x,
    y: transform.flipY ? BASE_HEIGHT - point.y : point.y,
  }));

  // 2. 中心からの距離を間隔の倍率で伸縮
  const scale = SPACING_SCALE[transform.spacing];
  const baseCenterX = BASE_WIDTH / 2;
  const baseCenterY = BASE_HEIGHT / 2;
  working = working.map((point) => ({
    x: baseCenterX + (point.x - baseCenterX) * scale,
    y: baseCenterY + (point.y - baseCenterY) * scale,
  }));

  // 3. 90度回転。縦横が入れ替わるので、入れ替えたあとの寸法が
  //    8x6に収まるよう中心基準で縮める
  if (transform.rotate) {
    const rotated = working.map((point) => ({
      x: baseCenterX + (point.y - baseCenterY),
      y: baseCenterY - (point.x - baseCenterX),
    }));
    const shrink = Math.min(
      BASE_WIDTH / BASE_HEIGHT,
      BASE_HEIGHT / BASE_WIDTH,
      1,
    );
    working = rotated.map((point) => ({
      x: baseCenterX + (point.x - baseCenterX) * shrink,
      y: baseCenterY + (point.y - baseCenterY) * shrink,
    }));
  }

  // 4. 実際のステージの広さへ比例配置し、範囲内へ収める
  return working.map((point) => ({
    x: clamp((point.x / BASE_WIDTH) * stageWidth, 0, stageWidth),
    y: clamp((point.y / BASE_HEIGHT) * stageHeight, 0, stageHeight),
  }));
}

// ---------------------------------------------------------------------------
// 誰をどこへ割り当てるか
// ---------------------------------------------------------------------------

/**
 * 点の数が人数より多いとき、どの点を使うかを決める。
 *
 * 「前列(客席側)から埋める」。空きができるなら、見えにくい奥の方を
 * 空けた方が舞台として自然だから。上=バックステージ=yが小さい、
 * 下=客席側=yが大きい、という座標系なのでyの大きい順に採る。
 *
 * 人数の方が多い(点が足りない)場合は、そのまま全ての点を返す。
 * あぶれた人をどうするかは呼び出し側の判断(いまの位置に残す)。
 */
export function selectPointsForDancers(
  points: FormationPoint[],
  dancerCount: number,
): FormationPoint[] {
  if (points.length <= dancerCount) return points;

  return [...points]
    .sort((a, b) => b.y - a.y)
    .slice(0, dancerCount);
}

type Placed = { dancerId: string; x: number; y: number };

/**
 * いまの位置から一番近い点へ、貪欲に割り当てる。
 *
 * 「全体の移動距離が最小」ではないが、どの人も自分に近い点へ行くので
 * 隊形の中の担当(左端の人・センターの人)が入れ替わりにくい。
 * 総当たりの最適割り当て(ハンガリアン法)まで持ち込む価値は無い。
 *
 * 点より人が多い場合、あぶれた人はその場に残す(呼び出し側で
 * 「余る人はいまの位置のまま」と案内する)。
 */
export function assignDancersToPoints(
  dancers: { dancerId: string; x: number; y: number }[],
  points: FormationPoint[],
): Placed[] {
  const remainingPoints = points.map((point, index) => ({ point, index }));
  const assignments: Placed[] = [];

  // 「その人にとっての最短距離」が短い人から順に確定させる。先に決まった
  // 人の点を後の人が奪えないので、近い人ほど自然な位置に収まる
  const order = [...dancers].sort((a, b) => {
    const nearest = (dancer: (typeof dancers)[number]) =>
      Math.min(
        ...points.map((point) =>
          (point.x - dancer.x) ** 2 + (point.y - dancer.y) ** 2,
        ),
      );
    return nearest(a) - nearest(b);
  });

  for (const dancer of order) {
    if (remainingPoints.length === 0) break;
    let bestIndex = 0;
    let bestDistance = Infinity;
    remainingPoints.forEach((candidate, index) => {
      const distance =
        (candidate.point.x - dancer.x) ** 2 +
        (candidate.point.y - dancer.y) ** 2;
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });
    const [chosen] = remainingPoints.splice(bestIndex, 1);
    assignments.push({
      dancerId: dancer.dancerId,
      x: chosen.point.x,
      y: chosen.point.y,
    });
  }

  return assignments;
}
