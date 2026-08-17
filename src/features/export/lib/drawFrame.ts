import { stageRect } from "@/features/export/lib/frameLayout";
import type { InterpolatedPosition } from "@/features/viewer/lib/interpolate";

/**
 * 動画の1コマを描く。
 *
 * ■ 画面のコピーではなく、描き直し
 * ステージのDOMをそのまま画像にする道もあるが、影・ぼかし・
 * フォントの読み込みが端末ごとに違って出るし、書き出しのたびに
 * 画面を触れなくなる。1コマは「配置のデータから描く」ものにして、
 * 画面とは切り離してある。
 *
 * ■ 色は呼び出し側から受け取る
 * テーマのCSS変数はCanvasからは読めない。呼び出し側(画面のある所)で
 * getComputedStyle して解決済みの値を渡す。
 */

export type FrameColors = {
  background: string;
  stage: string;
  grid: string;
  line: string;
  label: string;
  /** ダンサーの保存色 → いまのテーマでの実測値 */
  dancer: (color: string) => string;
  /**
   * 紙・黒板系のテーマで、印を「塗り」から「輪郭」に変えるための素材色
   * (`--marker-fill`)。暗い系のテーマでは `none` が入っていて、そのときは
   * 塗ったままにする。画面側(DancerIcon)が同じ変数で同じ分岐をしている。
   */
  markerFill: string;
  /** 輪郭の太さ(`--marker-stroke-width`)。SVGの32単位系での値 */
  markerStrokeWidth: number;
};

/**
 * 真上から見た人物のシルエット(頭＋鼻先)を、いまの位置に描く道を作る。
 *
 * ■ 画面と同じ形にする(2026-08-17)
 * ここは以前、丸と「向きを指す短い線」だった。**画面のダンサーは
 * 頭＋鼻先の人型**(DancerIcon.tsx)なので、書き出した動画だけ別の記号に
 * なっていた。おまけに線の向きが 180 度ずれていて、0 度(客席を向く)の
 * ダンサーが奥を向いて写っていた。
 *
 * 形の数値は DancerIcon の SVG(viewBox 32、頭は中心(16,16)の半径8、
 * 鼻先は (16,28)(12,22)(20,22))をそのまま半径からの比に直したもの:
 *   頭   … 半径 r
 *   鼻先 … 先端 1.5r / 付け根 ±0.5r・0.75r
 *
 * 回転の中心は頭の中心。SVG の rotate と同じ向き(画面上で時計回り)に
 * 揃えてあるので、0 度は画面の下＝客席側を向く。
 */
function tracePerformer(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  rotationAngle: number,
): void {
  const radians = (rotationAngle * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  /** 頭の中心を原点にした座標(下向きが正)を、回転させて画面へ置く */
  const place = (localX: number, localY: number): [number, number] => [
    x + localX * cos - localY * sin,
    y + localX * sin + localY * cos,
  ];

  context.beginPath();
  // 鼻先。頭と重なる部分は塗りでひとつながりになる
  const [tipX, tipY] = place(0, radius * 1.5);
  const [leftX, leftY] = place(-radius * 0.5, radius * 0.75);
  const [rightX, rightY] = place(radius * 0.5, radius * 0.75);
  context.moveTo(tipX, tipY);
  context.lineTo(leftX, leftY);
  context.lineTo(rightX, rightY);
  context.closePath();
  // 頭
  context.moveTo(x + radius, y);
  context.arc(x, y, radius, 0, Math.PI * 2);
}

export type FrameDancer = {
  id: string;
  name: string;
  color: string;
};

/** ステージ座標系の一点 */
type StagePoint = { x: number; y: number };

/**
 * ステージの上に重ねるもの。**どれも「入れる」と選んだときだけ渡ってくる。**
 *
 * 画面(表示とモード)で切り替えられるものと同じ3つを、書き出しでも
 * 選べるようにした。以前は「音が出るのか、導線が出るのか分からない」
 * まま押すしかなく、しかも書き出しには作品と同じだけ時間がかかるので、
 * **録り終えてから違うと分かる**のがいちばん高くついた。
 */
export type FrameOverlays = {
  /** バミリ。全シーンの立ち位置を床に重ねた印 */
  marks?: StagePoint[];
  /**
   * 導線。いまの区間の「誰がどこからどこへ」。
   *
   * `control` は曲げたときの制御点(二次ベジェ)。画面側と同じ式なので、
   * 手で曲げた導線もそのまま同じ形で出る(curvePath.ts / PathOverlay)。
   */
  paths?: { from: StagePoint; to: StagePoint; control?: StagePoint; color: string }[];
  /** 顔被り。客席から見えない人に印を付ける */
  blockedDancerIds?: ReadonlySet<string>;
};

export type DrawFrameInput = {
  width: number;
  height: number;
  stageWidth: number;
  stageHeight: number;
  positions: InterpolatedPosition[];
  dancers: Record<string, FrameDancer>;
  colors: FrameColors;
  /** 名前を出すか。人数が多いと文字だらけになるので選べるようにする */
  showNames: boolean;
  /** 右下に出す時刻。作品全体のどこかを見失わないため */
  clock?: string;
  overlays?: FrameOverlays;
};

export function drawFrame(
  context: CanvasRenderingContext2D,
  {
    width,
    height,
    stageWidth,
    stageHeight,
    positions,
    dancers,
    colors,
    showNames,
    clock,
    overlays,
  }: DrawFrameInput,
): void {
  context.clearRect(0, 0, width, height);
  context.fillStyle = colors.background;
  context.fillRect(0, 0, width, height);

  const rect = stageRect(width, height, stageWidth, stageHeight);

  // ステージの面
  context.fillStyle = colors.stage;
  context.fillRect(rect.x, rect.y, rect.width, rect.height);

  // 格子。1マス=実寸90cmなので、これが距離の手がかりになる
  context.strokeStyle = colors.grid;
  context.lineWidth = Math.max(1, rect.unit * 0.012);
  context.beginPath();
  for (let column = 1; column < stageWidth; column += 1) {
    const x = Math.round(rect.x + column * rect.unit) + 0.5;
    context.moveTo(x, rect.y);
    context.lineTo(x, rect.y + rect.height);
  }
  for (let row = 1; row < stageHeight; row += 1) {
    const y = Math.round(rect.y + row * rect.unit) + 0.5;
    context.moveTo(rect.x, y);
    context.lineTo(rect.x + rect.width, y);
  }
  context.stroke();

  // ステージの縁
  context.strokeStyle = colors.line;
  context.lineWidth = Math.max(1, rect.unit * 0.03);
  context.strokeRect(rect.x, rect.y, rect.width, rect.height);

  // 上下がどちらかを必ず書く。動画だけを渡された人には、
  // 画面の向きを知る手がかりが他に無い
  const labelSize = Math.max(10, rect.unit * 0.3);
  context.font = `600 ${labelSize}px system-ui, sans-serif`;
  context.fillStyle = colors.label;
  context.textAlign = "center";
  context.textBaseline = "alphabetic";
  context.fillText("バックステージ", width / 2, rect.y - labelSize * 0.5);
  context.textBaseline = "top";
  context.fillText("客席側", width / 2, rect.y + rect.height + labelSize * 0.5);

  /** ステージ座標 → 画面の座標 */
  const toX = (x: number) => rect.x + x * rect.unit;
  const toY = (y: number) => rect.y + y * rect.unit;

  // ダンサー
  const radius = rect.unit * 0.34;

  /* バミリと導線は【人より先に】描く。床に敷くものなので、
     人の上に乗ると隊形そのものが読みにくくなる */
  if (overlays?.marks?.length) {
    context.fillStyle = colors.line;
    for (const mark of overlays.marks) {
      context.beginPath();
      context.arc(toX(mark.x), toY(mark.y), radius * 0.22, 0, Math.PI * 2);
      context.fill();
    }
  }

  if (overlays?.paths?.length) {
    context.lineWidth = Math.max(1.5, radius * 0.16);
    context.lineCap = "round";
    for (const path of overlays.paths) {
      context.strokeStyle = path.color;
      context.globalAlpha = 0.55;
      context.beginPath();
      context.moveTo(toX(path.from.x), toY(path.from.y));
      if (path.control) {
        // 画面側と同じ二次ベジェ。手で曲げた導線もそのまま同じ形になる
        context.quadraticCurveTo(
          toX(path.control.x),
          toY(path.control.y),
          toX(path.to.x),
          toY(path.to.y),
        );
      } else {
        context.lineTo(toX(path.to.x), toY(path.to.y));
      }
      context.stroke();
      context.globalAlpha = 1;
    }
  }
  for (const position of positions) {
    const dancer = dancers[position.dancerId];
    if (!dancer) continue;

    const x = rect.x + position.x * rect.unit;
    const y = rect.y + position.y * rect.unit;

    const bodyColor = colors.dancer(dancer.color);

    tracePerformer(context, x, y, radius, position.rotationAngle);
    context.fillStyle = bodyColor;
    context.fill();

    // 紙・黒板系のテーマは、塗りではなく輪郭で描く。画面側は同じことを
    // 「素材色で塗り潰した同じ形を重ねる」形でやっている(DancerIcon.tsx)
    if (colors.markerFill !== "none" && colors.markerStrokeWidth > 0) {
      tracePerformer(context, x, y, radius, position.rotationAngle);
      context.fillStyle = colors.markerFill;
      context.fill();
      context.strokeStyle = bodyColor;
      // SVGの32単位系での太さ。頭の半径8がここでは radius なので、その比で直す
      context.lineWidth = (colors.markerStrokeWidth * radius) / 8;
      context.stroke();
    }

    /* 顔被りの印。**人の上に出す** — 隠れている本人を指すものなので、
       下に敷くと当の本人に隠れる。色は意味を運ぶので固定(画面側と同じ) */
    if (overlays?.blockedDancerIds?.has(position.dancerId)) {
      context.beginPath();
      context.arc(x, y, radius * 1.45, 0, Math.PI * 2);
      context.strokeStyle = "#f87171";
      context.lineWidth = Math.max(2, radius * 0.2);
      context.stroke();
    }

    if (showNames && dancer.name) {
      const nameSize = Math.max(9, rect.unit * 0.26);
      context.font = `700 ${nameSize}px system-ui, sans-serif`;
      context.textAlign = "center";
      context.textBaseline = "top";
      // 影を先に置く。暗い地でも明るい紙でも読めるようにするため
      context.fillStyle = "rgba(0,0,0,.85)";
      context.fillText(dancer.name, x + 1, y + radius + nameSize * 0.3 + 1);
      context.fillStyle = "#ffffff";
      context.fillText(dancer.name, x, y + radius + nameSize * 0.3);
    }
  }

  if (clock) {
    const clockSize = Math.max(10, rect.unit * 0.26);
    context.font = `500 ${clockSize}px ui-monospace, monospace`;
    context.fillStyle = colors.label;
    context.textAlign = "right";
    context.textBaseline = "bottom";
    context.fillText(clock, width - clockSize, height - clockSize * 0.8);
  }
}
