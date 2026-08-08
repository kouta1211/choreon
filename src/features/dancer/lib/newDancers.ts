/**
 * 「ダンサーをまとめて追加する」ときの、名前・色・立ち位置の決め方。
 *
 * どれもDOMにもSupabaseにも依存しない純粋な計算なので、ここに分けている。
 */

type Occupied = { xCoordinate: number; yCoordinate: number };

/** 既にいる人と同じマスとみなす距離(ユニット)。格子スナップの単位より
 * 小さくすると、わずかにずれた位置に重ねて置いてしまう */
const OCCUPIED_TOLERANCE = 0.5;

/**
 * 追加するダンサーの名前を作る。
 *
 * 名前は後から手で付け替える前提なので、まずは通し番号だけ振る。
 * 既にある数字の名前の最大+1から続けるので、削除して番号が飛んでいても
 * 既存の番号と衝突しない(1,2,3 のうち 2 を消してから足すと 4 になる)。
 * 数字以外の名前しか無ければ 1 から始める。
 */
export function nextDancerNames(
  existingNames: string[],
  count: number,
): string[] {
  const numbers = existingNames
    .map((name) => Number(name.trim()))
    .filter((value) => Number.isInteger(value) && value > 0);
  const start = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;

  return Array.from({ length: count }, (_, index) => String(start + index));
}

/**
 * 追加するダンサーの色を選ぶ。
 *
 * 「使われている数が最も少ない色」から順に取り、取るたびに数え上げる。
 * こうすると、まだ使っていない色がある限りそちらが優先されるので、
 * 一度に複数追加しても互いに同じ色にならない。パレットを一周したあとは
 * 均等に散る(全色1人ずついるなら、次の6人もまた1色ずつになる)。
 *
 * 以前は「人数 % パレット長」で決めていたため、誰かを削除すると次に
 * 追加する色が既存の誰かと衝突していた。
 */
export function pickDancerColors(
  existingColors: string[],
  count: number,
  palette: string[],
): string[] {
  const usage = new Map(palette.map((color) => [color, 0]));
  for (const color of existingColors) {
    if (usage.has(color)) usage.set(color, (usage.get(color) ?? 0) + 1);
  }

  const picked: string[] = [];
  for (let index = 0; index < count; index += 1) {
    // 同数のときはパレットの並び順で先のものを選ぶ(結果が毎回同じになる)
    let best = palette[0];
    for (const color of palette) {
      if ((usage.get(color) ?? 0) < (usage.get(best) ?? 0)) best = color;
    }
    picked.push(best);
    usage.set(best, (usage.get(best) ?? 0) + 1);
  }
  return picked;
}

/**
 * 新しく追加するダンサーの立ち位置を、必要な数だけ返す。
 *
 * ■ どこに置くか
 * 既にいる人が1人もいない行を優先し、その中で【最もバックステージ寄り】の
 * 行から埋める。行の中は中央から左右へ交互に広げる。
 *
 * 追加した人を既存の隊形の中に割り込ませないための順番。組みかけの
 * フォーメーションの真ん中に新しい人が挿し込まれると、隊形が崩れて
 * 見えるうえ、どれが元からいた人か分からなくなる。奥に一列で待たせて
 * おけば、必要なときに引っ張り出せばよい。
 *
 * 空いている行が尽きたら、次は「空きマスがある行」を同じくバックステージ
 * 寄りから使う。ステージの縁(y=0 と y=stageHeight)はマーカーが半分外へ
 * はみ出すので、内側の行を使い切ってから最後に回す。
 *
 * ■ 重ならないこと
 * 既にいる人のマスは避ける。0.5ユニット以内は同じマスとみなすので、
 * 格子から少しずれた位置にいる人にも重ねない。
 * (以前は全員ステージ中央に置いていたため、続けて追加すると重なって
 * 上の1人しか掴めなかった)
 *
 * 空きが足りない場合(ごく小さいステージ)は、最後に中央を返して重ねる。
 * 追加できない方が困るため。
 */
export function findFreePositions(
  occupied: Occupied[],
  count: number,
  stageWidth: number,
  stageHeight: number,
): { x: number; y: number }[] {
  const centerX = Math.round(stageWidth / 2);
  const centerY = Math.round(stageHeight / 2);

  const isTaken = (x: number, y: number) =>
    occupied.some(
      (position) =>
        Math.abs(position.xCoordinate - x) < OCCUPIED_TOLERANCE &&
        Math.abs(position.yCoordinate - y) < OCCUPIED_TOLERANCE,
    );
  const rowHasOccupant = (y: number) =>
    occupied.some(
      (position) => Math.abs(position.yCoordinate - y) < OCCUPIED_TOLERANCE,
    );

  // 行を選ぶ優先順:
  //   1. 内側か縁か … 縁(y=0 / y=stageHeight)はマーカーが半分ステージの外へ
  //      出るので最後に回す。既存の人と同じ行に並ぶ方がまだ見やすい
  //   2. 誰もいない行か … 組みかけの隊形に割り込まないため
  //   3. バックステージ(y小)から … 奥で待たせる
  const innerRows = Array.from(
    { length: Math.max(0, stageHeight - 1) },
    (_, index) => index + 1,
  );
  const edgeRows = stageHeight > 0 ? [0, stageHeight] : [0];

  const rows = [
    ...innerRows.filter((y) => !rowHasOccupant(y)),
    ...innerRows.filter((y) => rowHasOccupant(y)),
    ...edgeRows.filter((y) => !rowHasOccupant(y)),
    ...edgeRows.filter((y) => rowHasOccupant(y)),
  ];

  const found: { x: number; y: number }[] = [];
  const taken = new Set<string>();
  const claim = (x: number, y: number) => {
    const key = `${x},${y}`;
    if (taken.has(key) || isTaken(x, y)) return;
    taken.add(key);
    found.push({ x, y });
  };

  for (const y of rows) {
    if (found.length >= count) break;
    // 行の中は中央から左右へ交互に
    for (let step = 0; step <= stageWidth && found.length < count; step += 1) {
      for (const x of step === 0 ? [centerX] : [centerX - step, centerX + step]) {
        if (x < 0 || x > stageWidth) continue;
        if (found.length >= count) break;
        claim(x, y);
      }
    }
  }

  // それでも足りなければ中央に重ねる(追加できない方が困る)
  while (found.length < count) {
    found.push({ x: centerX, y: centerY });
  }
  return found;
}
