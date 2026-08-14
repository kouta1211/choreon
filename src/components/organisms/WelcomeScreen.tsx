"use client";

import { useState } from "react";
import { AuthScreen } from "@/components/molecules/AuthScreen";
import { PressableButton } from "@/components/atoms/PressableButton";
import { Checkbox } from "@/components/ui/checkbox";
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
  const setGuestTourIntent = useUIStore((state) => state.setGuestTourIntent);

  /**
   * 既定は「案内から始める」。
   *
   * 端末に覚えてある「もう見た」(hasSeenTutorial)を初期値にはしない。
   * localStorage はサーバー描画の時点で読めず、初期値に使うと最初の
   * 描画と食い違う。要らない人が1回外す、という形に倒してある。
   */
  const [wantsTour, setWantsTour] = useState(true);

  const handleGuestStart = () => {
    setGuestTourIntent(wantsTour ? "show" : "skip");
    onGuestStart();
  };

  return (
    <AuthScreen>
      <div className="flex flex-col gap-gutter">
        <div className="flex flex-col gap-unit">
          <PressableButton
            kind="primary"
            onClick={handleGuestStart}
            className="h-target-lg w-full rounded-lg bg-accent text-headline text-accent-fg"
          >
            {t.welcome.guestStart}
          </PressableButton>

          {/* 案内を見るかどうかは、押す前に見えているところで選ばせる。
              押したあとに「見ますか?」を出すと、面食らったという今回の
              話の通り、通る門が1枚増えるだけになる。
              ラベルまで含めて44px以上の的にするのは SceneTimeField と同じ */}
          <label className="flex min-h-11 items-center gap-2.5 text-label text-fg-sub">
            <Checkbox
              checked={wantsTour}
              onCheckedChange={(checked) => setWantsTour(checked === true)}
            />
            <span>{t.welcome.withTour}</span>
          </label>
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
