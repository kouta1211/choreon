"use client";

import { AuthScreen } from "@/components/molecules/AuthScreen";
import { PressableButton } from "@/components/atoms/PressableButton";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useT } from "@/features/i18n/LocaleProvider";

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

  return (
    <AuthScreen>
      <div className="flex flex-col gap-gutter">
        <div className="flex flex-col gap-unit">
          <PressableButton
            kind="primary"
            onClick={onGuestStart}
            className="h-target-lg w-full rounded-lg bg-accent text-headline text-accent-fg"
          >
            {t.welcome.guestStart}
          </PressableButton>
          {/* 「登録なしで始められる」ことと「消えること」は同じ重さで
              伝える。後者を伏せると、作った後で裏切ることになる。
              添え物の色(fg-muted)ではなく fg-sub なのはそのため —
              読み飛ばされて困る一行を、薄い方の色で書かない */}
          <p className="text-center text-label leading-relaxed text-fg-sub">
            {t.welcome.guestNote}
          </p>
        </div>

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
    </AuthScreen>
  );
}
