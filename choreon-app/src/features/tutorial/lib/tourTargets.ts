import { useEffect, useRef } from 'react';
import type { View } from 'react-native';

/**
 * 案内が指す先の登録簿。
 *
 * ■ Web版は `data-tour="stage"` という属性で指していた
 * DOM が無いここでは同じことができない。代わりに、指される側が
 * **自分の測り方**をここへ預ける。案内はその関数を呼んで、画面の
 * どこにあるかを聞く。
 *
 * ■ 説明用の偽UIを作らないのは Web版と同じ
 * 案内のためだけの画面を置くと、案内の中と本物とで置き場所がずれていき、
 * いずれ「案内どおりに触ると違う場所にある」状態になる。本物を指すので、
 * UIを直せば案内も一緒に正しくなる。
 *
 * ■ ストア（zustand）にしていない理由
 * 登録も測定も**描画に影響しない**。ストアに入れると、案内を出していない
 * 間も登録のたびに購読者が起き得る。ここはただのモジュール変数で足りる。
 */

/**
 * 指せる先の名前。
 *
 * `timeline`（曲の時間軸）と `scene-dock`（等間隔の帯）は**同時には出ない**。
 * 曲を入れているかで入れ替わる。同じ名前にまとめないのは、案内で読む文が
 * 違うため — 時間軸の説明を等間隔の帯に付けると、書いてあるとおりに
 * 触れないものになる。
 */
export type TourTargetName =
  | 'stage'
  | 'timeline'
  | 'scene-dock'
  | 'add-scene'
  | 'display-menu';

/** 画面（ウィンドウ）を原点とした矩形。measureInWindow が返す形 */
export type TourRect = { x: number; y: number; width: number; height: number };

const measurers = new Map<TourTargetName, () => Promise<TourRect | null>>();

/**
 * 指される側になる。返した ref を、測ってほしい View / Pressable へ付ける。
 *
 * **包む View を足さない**のが要点。案内のために親を1枚かぶせると、
 * flex の並びが変わって見た目が動く。ref を渡すだけなら何も変わらない。
 */
export function useTourTarget(name: TourTargetName) {
  const ref = useRef<View | null>(null);

  useEffect(() => {
    const measure = () => measureRef(ref.current);
    measurers.set(name, measure);
    return () => {
      // 消すのは【自分が入れた分だけ】。同じ名前を別の画面が登録し直して
      // いることがある（曲があるときは MusicTimeline、無ければ SceneDock が
      // "timeline" を名乗る）。入れ替わりの順番によっては、こちらの後始末が
      // 相手の登録より後に走り、素直に消すと**相手の分を消してしまう**
      if (measurers.get(name) === measure) measurers.delete(name);
    };
  }, [name]);

  return ref;
}

function measureRef(node: View | null): Promise<TourRect | null> {
  return new Promise((resolve) => {
    if (!node) {
      resolve(null);
      return;
    }
    node.measureInWindow((x, y, width, height) => {
      // 畳まれている・まだ描かれていないと 0 が返る。指す先が無い扱いにして
      // その段を飛ばす（0×0 の穴に吹き出しを付けても何も指せない）
      resolve(width > 0 && height > 0 ? { x, y, width, height } : null);
    });
  });
}

/** 案内から呼ぶ。まだ描かれていなければ null */
export async function measureTourTarget(name: TourTargetName): Promise<TourRect | null> {
  const measure = measurers.get(name);
  if (!measure) return null;
  return measure();
}

/** テスト用。登録簿を空にする */
export function clearTourTargets(): void {
  measurers.clear();
}
