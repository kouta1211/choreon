"use client";

import {
  useState,
  useSyncExternalStore,
  type FormEvent,
  type ReactNode,
} from "react";
import { Mail, X } from "lucide-react";
import {
  signInWithPassword,
  signUpWithPassword,
} from "@/features/auth/api/auth";
import {
  AuthField,
  AuthNotice,
  AuthSubmitButton,
} from "@/components/molecules/AuthScreen";
import { PressableButton } from "@/components/atoms/PressableButton";
import { useT } from "@/features/i18n/LocaleProvider";

export type AuthMode = "login" | "signup";

type Props = {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  /** 認証に成功した直後の処理。ゲストの下書きの保存など。
   * 完了するまでボタンはスピナーのままにしたいのでawaitする */
  onAuthenticated: (userId: string) => void | Promise<void>;
  /** 「登録するとどうなるか」を、その場面に合わせて添える文 */
  intro?: ReactNode;
  /** 確認メールを送った後に添える文(下書きがあるときの注意など) */
  emailSentNote?: ReactNode;
};

/**
 * ログインと新規登録のフォーム本体。
 *
 * 同じフォームを ①/login・/signup のページ ②作りかけの作品の上に出す
 * モーダル の2箇所で使う。以前は2つのページがそれぞれ同じ内容を持っていて、
 * モーダルを足すと3つ目の写しができるところだった。
 *
 * 認証後にすることが場面ごとに違う(ページなら一覧へ、モーダルなら下書きの
 * 保存へ)ため、そこだけをonAuthenticatedとして外に出している。
 */
export function AuthForm({
  mode,
  onModeChange,
  onAuthenticated,
  intro,
  emailSentNote,
}: Props) {
  const t = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  // Supabaseの既定の認証フロー(PKCE)は、鍵の作成に crypto.subtle を使う。
  // このAPIは【セキュアコンテキスト限定】で、ブラウザは localhost と https
  // だけをセキュアとみなす。同じLANのスマートフォンから http://192.168.x.x で
  // 開くとここから外れ、認証だけが黙って失敗していた。
  //
  // 画面には「メールアドレスまたはパスワードが正しくありません」としか
  // 出ていなかったため、正しく入力しているのに入れない、という見え方をする。
  // 原因と対処をその場に出す。
  //
  // useSyncExternalStore を使うのは、サーバーには window が無く、
  // 「サーバーでは false・ブラウザでは実際の値」を宣言的に書ける唯一の形
  // だから。値は途中で変わらないので購読はしない
  const isInsecureOrigin = useSyncExternalStore(
    subscribeToNothing,
    () => !window.isSecureContext,
    () => false,
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    // ここで止めないと、Supabase側の内部エラーが
    // 「パスワードが違う」として表示されてしまう
    if (isInsecureOrigin) return;

    setIsSubmitting(true);

    if (mode === "login") {
      const { data, error: signInError } = await signInWithPassword(
        email,
        password,
      );
      if (signInError || !data.user) {
        setError(t.auth.wrongCredentials);
        setIsSubmitting(false);
        return;
      }
      await onAuthenticated(data.user.id);
      // 成功時はページが移動するので、isSubmittingは戻さない
      // (戻すと移動までの一瞬だけボタンが押せる状態に見える)
      return;
    }

    const { data, error: signUpError } = await signUpWithPassword(
      email,
      password,
    );

    if (signUpError) {
      setError(
        signUpError.message === "User already registered"
          ? t.auth.alreadyRegistered
          : t.auth.signUpFailed,
      );
      setIsSubmitting(false);
      return;
    }

    // Supabase側でメール確認を無効にしている場合、登録と同時にログイン状態になる
    if (data.session && data.user) {
      await onAuthenticated(data.user.id);
      return;
    }

    setIsEmailSent(true);
    setIsSubmitting(false);
  };

  // 送信後はフォームごと差し替える。入力欄が残っていると、もう一度
  // 送るべきなのかメールを待つべきなのかが分からなくなるため
  if (isEmailSent) {
    return (
      <div className="flex flex-col items-center gap-gutter text-center">
        {/* 成否は【形】で伝え、面の色は変えない — トーストと同じ作法。
            以前はここだけ緑の丸で、画面の中で1つだけ別の言葉だった */}
        <span
          aria-hidden
          className="flex h-target w-target items-center justify-center rounded-full bg-surface-strong text-fg-strong"
        >
          <Mail size={20} />
        </span>
        <div className="flex flex-col gap-base">
          <p className="text-headline text-fg-strong">{t.auth.confirmSent}</p>
          <p className="text-label leading-relaxed text-fg-sub">
            {t.auth.confirmOpen}
          </p>
        </div>
        {emailSentNote}
        <PressableButton
          onClick={() => {
            setIsEmailSent(false);
            onModeChange("login");
          }}
          className="text-label text-accent-soft underline"
        >
          {t.auth.backToSignIn}
        </PressableButton>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-gutter">
      {intro}

      {isInsecureOrigin && (
        <AuthNotice>
          {t.auth.insecure}
          <span className="mt-base block text-amber-200/80">
            {t.auth.insecureWhy("https", "localhost")}
            <code className="font-mono"> npm run dev:https </code>
            {t.auth.insecureHow}
          </span>
        </AuthNotice>
      )}

      <AuthField
        label={t.auth.email}
        id={`${mode}-email`}
        type="email"
        required
        autoComplete="email"
        hasError={error !== null}
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />

      <AuthField
        label={mode === "signup" ? t.auth.passwordSignUp : t.auth.password}
        id={`${mode}-password`}
        type="password"
        required
        minLength={mode === "signup" ? 6 : undefined}
        autoComplete={mode === "signup" ? "new-password" : "current-password"}
        hasError={error !== null}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />

      {/* 失敗も【形】で伝える（トーストと同じ）。赤の一行だけで出していた
          ときは、入力欄の枠(アクセント色)と言っていることが食い違って
          いた。文字は本文と同じ濃さで、印だけを添える */}
      {error && (
        <p role="alert" className="flex items-start gap-unit text-label text-fg">
          <span
            aria-hidden
            className="mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-surface-strong text-fg-strong"
          >
            <X size={10} strokeWidth={3} />
          </span>
          {error}
        </p>
      )}

      <AuthSubmitButton
        isSubmitting={isSubmitting}
        pendingLabel={mode === "signup" ? t.auth.signingUp : t.auth.signingIn}
      >
        {mode === "signup" ? t.auth.submitSignUp : t.auth.signIn}
      </AuthSubmitButton>

      {/* 文と押す所の間は、文字列の末尾の空白ではなく gap で開ける。
          空白は3言語ぶん写す必要があるうえ、翻訳で必ず落ちる */}
      <p className="flex flex-wrap items-center justify-center gap-base text-label text-fg-muted">
        {mode === "signup" ? t.auth.haveAccount : t.auth.noAccount}
        <PressableButton
          onClick={() => {
            setError(null);
            onModeChange(mode === "signup" ? "login" : "signup");
          }}
          className="text-label text-accent-soft underline"
        >
          {mode === "signup" ? t.auth.signIn : t.auth.signUp}
        </PressableButton>
      </p>
    </form>
  );
}

/** isSecureContext は読み込み後に変わらないので、購読は何もしない */
function subscribeToNothing() {
  return () => {};
}
