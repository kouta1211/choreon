/**
 * 指(ポインタ)を掴んでおくための小さな包み。
 *
 * setPointerCapture は、要素の外へ指が出ても pointermove を届け続けてくれる。
 * 横へ引く操作では、指が帯の外へ出た時点で動きが止まってしまうため要る。
 *
 * ただし【失敗することがある】。既に離れた指のIDを渡した場合や、
 * 合成されたイベント(テストなど)では例外を投げる。掴めなくても操作の
 * 本体は成立する(要素の上から外れたときに追随できなくなるだけ)ので、
 * ここで握り潰して先へ進める。
 */
export function capturePointer(element: Element, pointerId: number): void {
  try {
    element.setPointerCapture(pointerId);
  } catch {
    // 掴めないまま続ける
  }
}

/** 掴んでいれば離す。掴めていなければ何もしない */
export function releasePointer(element: Element, pointerId: number): void {
  try {
    if (element.hasPointerCapture(pointerId)) {
      element.releasePointerCapture(pointerId);
    }
  } catch {
    // 既に離れている
  }
}
