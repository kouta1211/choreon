import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { vars } from 'nativewind';

import { useUIStore } from '@/features/canvas/store/useUIStore';
import { useT } from '@/features/i18n/store/useLocaleStore';
import type { Messages } from '@/features/i18n/messages/ja';
import {
  hasSeenTutorial,
  markTutorialSeen,
} from '@/features/tutorial/lib/tutorialPreference';
import {
  measureTourTarget,
  type TourRect,
  type TourTargetName,
} from '@/features/tutorial/lib/tourTargets';
import { THEME_VARS } from '@/features/theme/themeVars.generated';
import { useCurrentTheme } from '@/features/theme/store/useThemeStore';

/** 指す先を囲む余白。ぴったりだと縁が要素に食い込んで見える */
const HALO = 6;
/** 吹き出しと、指す先とのあいだ */
const GAP = 12;
/** 吹き出しの高さの見込み。上に出すか下に出すかを決めるためだけに使う */
const CARD_ALLOWANCE = 190;
/** 画面の端に寄りすぎないための余白 */
const EDGE = 12;

type Step = {
  target: TourTargetName;
  title: (t: Messages) => string;
  body: (t: Messages) => string;
  /** 指す先の【下】に吹き出しを出したいか。入らなければ反対側へ回る */
  prefer: 'below' | 'above';
};

/**
 * 段の並び。**出ていないものは黙って落とす**ので、ここには
 * 「出ることがあるもの」を全部並べてよい。
 *
 * 時間軸（曲を入れているとき）と シーンの帯（入れていないとき）は
 * 隣り合わせに置いてある。どちらか片方しか出ないので、通しで見ると
 * ちょうど1つだけがこの位置に入る。
 */
const STEPS: Step[] = [
  {
    target: 'stage',
    title: (t) => t.tour.stageTitle,
    body: (t) => t.tour.stageBody,
    prefer: 'below',
  },
  {
    target: 'timeline',
    title: (t) => t.tour.timelineTitle,
    body: (t) => t.tour.timelineBody,
    prefer: 'above',
  },
  {
    target: 'scene-dock',
    title: (t) => t.tour.dockTitle,
    body: (t) => t.tour.dockBody,
    prefer: 'above',
  },
  {
    target: 'add-scene',
    title: (t) => t.tour.addTitle,
    body: (t) => t.tour.addBody,
    prefer: 'above',
  },
  {
    target: 'display-menu',
    title: (t) => t.tour.viewTitle,
    body: (t) => t.tour.viewBody,
    prefer: 'below',
  },
];

/**
 * 初めて開いた人へ出す使い方の案内。Web版 EditorTour の翻訳。
 *
 * ■ react-joyride は持ってこられない
 * あちらは DOM のセレクタ（`[data-tour="stage"]`）で指す先を探し、
 * CSS で穴を開けている。どちらもここには無い。**指す先は
 * `useTourTarget` で登録**し、穴は【4枚の幕】で作る。
 *
 * ```
 *   ┌──────────┐   上
 *   ├──┬────┬──┤
 *   │左│ 穴 │右│   ← 穴のところだけ幕を置かない
 *   ├──┴────┴──┤
 *   └──────────┘   下
 * ```
 *
 * マスクを使えば1枚で済むが、`react-native-svg` のマスクは Web/iOS/Android
 * で出方が揃わない。4枚は素朴だが、どこでも同じに出る。
 *
 * ■ 説明用の画面を作らない（Web版と同じ判断）
 * 案内のためだけの偽のUIを置くと、案内の中と本物とで置き場所がずれていき、
 * いずれ「案内どおりに触ると違う場所にある」状態になる。
 *
 * ■ 指す先が無い段は飛ばす
 * 曲を入れていなければ時間軸は出ていないし、広い画面では下の帯そのものが
 * 出ない。**指せないものを指す**より、その段を黙って飛ばす方がよい。
 *
 * ■ いつでも飛ばせる。飛ばしても「見た」
 * 分かっている人に読ませない。もう一度見る道は「表示とモード」に置く。
 *
 * ■ 動きは付けない
 * 段を移ると穴と吹き出しが**その場で**入れ替わる。滑らせるのはフェーズ4。
 */
export function EditorTour() {
  const t = useT();
  const theme = useCurrentTheme();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const tourRequestedAt = useUIStore((state) => state.tourRequestedAt);

  const [isRunning, setRunning] = useState(false);
  /**
   * 実際に出す段。**始めるときに測って決める。**
   *
   * 「その場で無ければ飛ばす」だけにすると、進み具合が 1/5 → 3/5 と飛び、
   * 読んでいる側には数え間違いに見える。始める前に全部測って落としておけば、
   * 1/4・2/4… と素直に進む。
   */
  const [steps, setSteps] = useState<Step[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<TourRect | null>(null);
  /** 済ませた依頼の時刻。これと `tourRequestedAt` が同じなら、もう出さない */
  const [handledAt, setHandledAt] = useState<number | null>(null);

  // 初回だけ自動で出す。読み込み直後は指す先がまだ描かれていないので、
  // 少し待ってから始める（Web版と同じ 500ms）
  useEffect(() => {
    // ゲストで始めるときに選んでいれば、それに従う。購読せず getState で
    // 1回だけ読むのは、この判断がマウント時に一度決まればよいため
    const intent = useUIStore.getState().guestTourIntent;
    if (intent === 'skip') return;

    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    void (async () => {
      if (intent !== 'show' && (await hasSeenTutorial())) return;
      if (!alive) return;
      timer = setTimeout(() => {
        if (alive) {
          setStepIndex(0);
          setRunning(true);
        }
      }, 500);
    })();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, []);

  // 「表示とモード」から頼まれたら、見たかどうかに関わらず出す
  useEffect(() => {
    if (tourRequestedAt === null || tourRequestedAt === handledAt) return;
    setStepIndex(0);
    setRunning(true);
  }, [tourRequestedAt, handledAt]);

  const finish = useCallback(() => {
    setRunning(false);
    setRect(null);
    // 次に頼まれたときは組み直す（そのあいだに曲を入れたかもしれない）
    setSteps([]);
    setHandledAt(useUIStore.getState().tourRequestedAt);
    // 最後まで見ても飛ばしても「見た」。分かっている人に二度と自動で出さない
    void markTutorialSeen();
  }, []);

  /** 指す先へ移る。移った先が消えていたら（画面が変わった）そこで終わる */
  const goTo = useCallback(
    async (list: Step[], index: number) => {
      const found = list[index] ? await measureTourTarget(list[index].target) : null;
      if (!found) {
        finish();
        return;
      }
      setStepIndex(index);
      setRect(found);
    },
    [finish],
  );

  // 出はじめと、画面の向き・大きさが変わったときに測り直す
  useEffect(() => {
    if (!isRunning) return;
    let alive = true;
    void (async () => {
      // 始まったときだけ組み直す。途中の測り直しでは並びを変えない
      // （読んでいる最中に段の数が変わると、進み具合が飛ぶ）
      let list = steps;
      if (list.length === 0) {
        const found: Step[] = [];
        for (const step of STEPS) {
          if (await measureTourTarget(step.target)) found.push(step);
        }
        if (!alive) return;
        list = found;
        setSteps(found);
      }
      if (list.length === 0) {
        finish();
        return;
      }
      await goTo(list, Math.min(stepIndex, list.length - 1));
    })();
    return () => {
      alive = false;
    };
    // stepIndex / steps は中で動かす。見張ると測り直しが止まらない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, screenWidth, screenHeight]);

  const step = steps[stepIndex];
  if (!isRunning || !rect || !step) return null;
  const holeTop = Math.max(0, rect.y - HALO);
  const holeLeft = Math.max(0, rect.x - HALO);
  const holeWidth = Math.min(screenWidth - holeLeft, rect.width + HALO * 2);
  const holeHeight = Math.min(screenHeight - holeTop, rect.height + HALO * 2);
  const holeBottom = holeTop + holeHeight;

  // 好きな側に入らなければ反対側。どちらにも入らなければ、広い方へ寄せる
  const spaceBelow = screenHeight - holeBottom - GAP;
  const spaceAbove = holeTop - GAP;
  const isBelow =
    step.prefer === 'below'
      ? spaceBelow >= CARD_ALLOWANCE || spaceBelow >= spaceAbove
      : !(spaceAbove >= CARD_ALLOWANCE || spaceAbove >= spaceBelow);

  /**
   * 吹き出しの上端。**必ず画面の中へ収める。**
   *
   * ステージのように画面の大半を占めるものを指すと、どちらの側にも
   * 吹き出しぶんの高さが残らない。そのときは穴に少し重なっても
   * 構わないので、画面の中へ押し戻す（画面の外に出ると読めない）。
   */
  const cardTop = Math.min(
    Math.max(isBelow ? holeBottom + GAP : holeTop - GAP - CARD_ALLOWANCE, EDGE),
    Math.max(EDGE, screenHeight - CARD_ALLOWANCE - EDGE),
  );

  const isLast = stepIndex === steps.length - 1;
  const humanStep = stepIndex + 1;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={finish} statusBarTranslucent>
      {/* Modal はテーマの外側に描かれるので、ここでもう一度当てる
          （sheet.tsx / confirm-dialog.tsx と同じ理由） */}
      <View style={vars(THEME_VARS[theme])} className="flex-1">
        {/* 幕4枚。**穴の上には何も置かない** ので、指している場所だけが
            はっきり見える。押しても閉じない — 案内の最中に画面へ触れると
            消えてしまうと、読んでいる途中で消える事故になる */}
        <View
          style={{ top: 0, left: 0, right: 0, height: holeTop }}
          className="absolute bg-scrim opacity-60"
        />
        <View
          style={{ top: holeBottom, left: 0, right: 0, bottom: 0 }}
          className="absolute bg-scrim opacity-60"
        />
        <View
          style={{ top: holeTop, left: 0, width: holeLeft, height: holeHeight }}
          className="absolute bg-scrim opacity-60"
        />
        <View
          style={{
            top: holeTop,
            left: holeLeft + holeWidth,
            right: 0,
            height: holeHeight,
          }}
          className="absolute bg-scrim opacity-60"
        />

        {/* 穴の縁。幕だけだと「暗くない場所」でしかなく、どこまでが
            指されているのか分からない */}
        <View
          pointerEvents="none"
          style={{ top: holeTop, left: holeLeft, width: holeWidth, height: holeHeight }}
          className="absolute rounded-xl border-2 border-accent"
        />

        {/* 地の色は **--bg（不透明）**。板の色 --surface は白4%の半透明で、
            シートはそれでも不透明に見える（全面の幕の上に乗るため）。
            この吹き出しは幕の切れ目に置くので、素直に bg-surface だけに
            すると後ろの再生ボタンが透けて読めなくなる。不透明な地を
            敷いた上に板の色を重ねる（Web版が joyride の吹き出しに
            backgroundImage で同じことをしているのと同じ理屈） */}
        <View
          style={{ top: cardTop, left: EDGE, right: EDGE }}
          className="absolute max-w-[420px] gap-2 self-center overflow-hidden rounded-2xl border border-line bg-page p-4"
        >
          <View pointerEvents="none" className="absolute inset-0 bg-surface" />
          <Text className="text-[13px] font-semibold text-fg-strong">{step.title(t)}</Text>
          <Text className="text-xs leading-5 text-fg-sub">{step.body(t)}</Text>

          <View className="mt-1 flex-row items-center justify-between">
            <Pressable
              onPress={finish}
              accessibilityRole="button"
              className="-mx-2 shrink rounded-lg px-2 py-1.5 active:opacity-70"
            >
              <Text className="text-xs text-fg-muted">{t.tour.skip}</Text>
            </Pressable>

            <View className="flex-row items-center gap-2">
              {stepIndex > 0 ? (
                <Pressable
                  onPress={() => void goTo(steps, stepIndex - 1)}
                  accessibilityRole="button"
                  className="shrink-0 rounded-lg px-3 py-1.5 active:opacity-70"
                >
                  <Text className="text-xs text-fg-sub">{t.tour.back}</Text>
                </Pressable>
              ) : null}

              <Pressable
                onPress={() => (isLast ? finish() : void goTo(steps, stepIndex + 1))}
                accessibilityRole="button"
                className="min-h-9 shrink-0 justify-center rounded-lg bg-accent px-4 active:opacity-80"
              >
                <Text className="text-xs font-semibold text-accent-fg">
                  {isLast
                    ? t.tour.last
                    : t.tour.nextWithProgress(humanStep, steps.length)}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
