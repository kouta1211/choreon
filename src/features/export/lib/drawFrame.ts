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
};

export type FrameDancer = {
  id: string;
  name: string;
  color: string;
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

  // ダンサー
  const radius = rect.unit * 0.34;
  for (const position of positions) {
    const dancer = dancers[position.dancerId];
    if (!dancer) continue;

    const x = rect.x + position.x * rect.unit;
    const y = rect.y + position.y * rect.unit;

    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fillStyle = colors.dancer(dancer.color);
    context.fill();

    // 向き。丸だけだと、回転している作品で何が起きているか分からない
    const angle = ((position.rotationAngle - 90) * Math.PI) / 180;
    context.beginPath();
    context.moveTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
    context.lineTo(
      x + Math.cos(angle) * radius * 1.45,
      y + Math.sin(angle) * radius * 1.45,
    );
    context.strokeStyle = colors.dancer(dancer.color);
    context.lineWidth = Math.max(2, radius * 0.28);
    context.lineCap = "round";
    context.stroke();

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
