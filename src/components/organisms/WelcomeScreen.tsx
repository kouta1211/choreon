"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { ChevronRight } from "lucide-react";
import { AuthScreen } from "@/components/molecules/AuthScreen";
import { PressableButton } from "@/components/atoms/PressableButton";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useT } from "@/features/i18n/LocaleProvider";
import {
  parseLastViewed,
  readLastViewedRaw,
  readLastViewedServer,
  subscribeLastViewed,
} from "@/features/viewer/lib/lastViewed";

type Props = {
  /** ゲストのまま始める。呼び出し側がエディタへ差し替える */
  onGuestStart: () => void;
};

/**
 * 未ログインで開いたときに最初に出る、始め方を選ぶ画面。
 *
 * ■ なぜ挟むのか
 * 以前はいきなりゲストのエディタが始まっていた。「まず作ってもらってから
 * 登録を求める」という狙いは正しかったが、**始め方が選択になっていない**
 * ため、開いた人は何が起きたのか分からず、既にアカウントを持っている人は
 * ログインの入り口を探すことになる。一拍置いて、3つの道を見せる。
 *
 * ■ ログイン/新規登録で画面を移動させない
 * layout.tsx が全画面ぶんの AuthDialog を1つ持っているので、ここからは
 * 開く合図を出すだけでよい。認証後の後始末(一覧の取り直し)も
 * AuthDialog 側が既に持っている。専用の遷移を足すと、同じ処理が2つになる。
 *
 * 器は AuthScreen を使い回している。ログイン画面と同じ舞台・同じマークで
 * 出ることで、「別のアプリに飛ばされた」感じにならない。
 */
export function WelcomeScreen({ onGuestStart }: Props) {
  const t = useT();
  const openAuthDialog = useUIStore((state) => state.openAuthDialog);
  const setGuestTourIntent = useUIStore((state) => state.setGuestTourIntent);

  /**
   * 案内を見るかどうかを聞いている最中か。
   *
   * ■ 押す前のチェックから、押したあとの板へ戻した(2026-08-17)
   * 「ゲストで始めるを押した際に、案内を使うかどうかの選択を要求したい」
   * という指摘。以前は逆に「押したあとに聞くと門が1枚増える」として
   * チェックボックスにしていたが、**チェックは読まれずに素通りされる**。
   * 始め方を選ぶ画面まで来た人は選ぶつもりで来ているので、ここで
   * 一拍聞く方が伝わる、という判断。
   *
   * 端末に覚えてある「もう見た」を初期値にはしない。localStorage は
   * サーバー描画の時点で読めず、初期値に使うと最初の描画と食い違う。
   */
  const [isAsking, setIsAsking] = useState(false);

  const start = (wantsTour: boolean) => {
    setGuestTourIntent(wantsTour ? "show" : "skip");
    onGuestStart();
  };

  /* 端末の記憶はReactの外にある値なので、購読そのものとして読む
     （useScreenKind と同じ形）。サーバー側には無いので null から始まり、
     ブラウザで描き直されたときに出る */
  const lastViewedRaw = useSyncExternalStore(
    subscribeLastViewed,
    readLastViewedRaw,
    readLastViewedServer,
  );
  const lastViewed = useMemo(
    () => parseLastViewed(lastViewedRaw),
    [lastViewedRaw],
  );

  return (
    <AuthScreen>
      <div className="flex flex-col gap-gutter">
        {/* 説明の1行はここにあったが、2026-08-20 に user の判断で外した。
            2行 → 1行 → 無し、と削ってきた場所。**戻すときは
            「他の隊形アプリでも言える文」になっていないかを見る** —
            そうなっていたのが外した理由。 */}

        {/* **一度見た振付へ戻る道**(2026-08-18、実機の報告 05-5)。
            ホーム画面に置いたアイコンはトップページを開くので、圏外だと
            さっきまで見ていた振付へ戻れなかった。見る人はアカウントを
            持っていないので、端末に覚えたものをここへ出す。
            リンクが無効になっていれば、開いた先で「見られません」が出る
            — ここで先回りして消すと、電波が悪いだけの人の入口まで消える */}
        {lastViewed && (
          <a
            href={lastViewed.path}
            className="flex min-h-target items-center gap-unit rounded-lg border border-line bg-surface-raised px-gutter py-unit text-left"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-caption text-fg-muted">
                {t.welcome.lastViewed.label}
              </span>
              <span className="block truncate text-body text-fg-strong">
                {lastViewed.title}
              </span>
            </span>
            <ChevronRight size={16} className="shrink-0 text-fg-muted" aria-hidden />
          </a>
        )}

        {/* ボタンの下の注記も、同じ判断で外した（2026-08-20）。
            **「作ったものはこの端末にだけ残ります」は、いまどこにも
            出ていない。** 戻すならこのすぐ下 */}
        <PressableButton
          kind="primary"
          onClick={() => setIsAsking(true)}
          className="h-target-lg w-full rounded-lg bg-accent text-headline text-accent-fg"
        >
          {t.welcome.guestStart}
        </PressableButton>

        <div className="flex items-center gap-unit">
          <span aria-hidden className="h-px flex-1 bg-line" />
          <span className="text-caption text-fg-muted">{t.welcome.or}</span>
          <span aria-hidden className="h-px flex-1 bg-line" />
        </div>

        <div className="flex gap-unit">
          <PressableButton
            onClick={() => openAuthDialog("login")}
            className="h-target flex-1 rounded-lg border border-line bg-surface-raised text-body text-fg-strong"
          >
            {t.auth.signIn}
          </PressableButton>
          <PressableButton
            onClick={() => openAuthDialog("signup")}
            className="h-target flex-1 rounded-lg border border-line bg-surface-raised text-body text-fg-strong"
          >
            {t.auth.signUp}
          </PressableButton>
        </div>
      </div>

      {/* 押したあとに一拍聞く板。幕はシートと同じ濃さ(bg-scrim/60)にする —
          ここだけ別の暗さにすると、同じ「手前に出る板」が場所によって
          違う見え方をする */}
      {isAsking && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t.welcome.tourAsk.title}
          className="fixed inset-0 z-50 flex items-center justify-center bg-scrim/60 px-4 backdrop-blur-[2px]"
        >
          <div className="overlay-panel flex w-full max-w-xs flex-col gap-gutter rounded-2xl p-6">
            <div className="flex flex-col gap-base text-center">
              <p className="text-title text-fg-strong">
                {t.welcome.tourAsk.title}
              </p>
              <p className="text-label leading-relaxed text-fg-sub">
                {t.welcome.tourAsk.body}
              </p>
            </div>
            <div className="flex flex-col gap-unit">
              <PressableButton
                kind="primary"
                autoFocus
                onClick={() => start(true)}
                className="h-target-lg w-full rounded-lg bg-accent text-headline text-accent-fg"
              >
                {t.welcome.tourAsk.withTour}
              </PressableButton>
              {/* skip も同じ大きさの的にする。「見ない」を選ぶ人の方が
                  急いでいるので、そちらを小さくすると押しにくい */}
              <PressableButton
                onClick={() => start(false)}
                className="h-target w-full rounded-lg border border-line bg-surface-raised text-body text-fg-strong"
              >
                {t.tour.skip}
              </PressableButton>
            </div>
          </div>
        </div>
      )}
    </AuthScreen>
  );
}
