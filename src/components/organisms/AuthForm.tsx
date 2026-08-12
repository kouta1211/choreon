"use client";

import {
  useState,
  useSyncExternalStore,
  type FormEvent,
  type ReactNode,
} from "react";
import { Mail } from "lucide-react";
import {
  signInWithPassword,
  signUpWithPassword,
} from "@/features/auth/api/auth";
import { AuthField, AuthSubmitButton } from "@/components/molecules/AuthScreen";

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
        setError("メールアドレスまたはパスワードが正しくありません。");
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
          ? "このメールアドレスは既に登録されています。"
          : "登録に失敗しました。時間をおいて再度お試しください。",
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
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <span
          aria-hidden
          className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-600/16 text-emerald-400"
        >
          <Mail size={20} />
        </span>
        <p className="text-sm font-medium text-fg-strong">
          確認メールを送信しました。
        </p>
        <p className="text-xs leading-relaxed text-fg-muted">
          メール内のリンクを開くと登録が完了します。
        </p>
        {emailSentNote}
        <button
          type="button"
          onClick={() => {
            setIsEmailSent(false);
            onModeChange("login");
          }}
          className="mt-1 text-xs text-accent-soft underline"
        >
          ログイン画面に戻る
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5">
      {intro}

      {isInsecureOrigin && (
        <p
          role="status"
          className="rounded-[calc(var(--radius)*0.6667)] border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-[12px] leading-relaxed text-amber-200"
        >
          この画面は暗号化されていない接続で開かれているため、ログインできません。
          <span className="mt-1 block text-amber-200/80">
            ブラウザは <code className="font-mono">https</code> と{" "}
            <code className="font-mono">localhost</code> だけを安全とみなし、
            認証に必要な機能をそれ以外で無効にします。実機で試すときは
            <code className="font-mono"> npm run dev:https </code>
            で立ち上げ、<code className="font-mono">https://</code>{" "}
            で開いてください。
          </span>
        </p>
      )}

      <AuthField
        label="メールアドレス"
        id={`${mode}-email`}
        type="email"
        required
        autoComplete="email"
        hasError={error !== null}
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />

      <AuthField
        label={mode === "signup" ? "パスワード(6文字以上)" : "パスワード"}
        id={`${mode}-password`}
        type="password"
        required
        minLength={mode === "signup" ? 6 : undefined}
        autoComplete={mode === "signup" ? "new-password" : "current-password"}
        hasError={error !== null}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />

      {error && <p className="text-xs text-red-400">{error}</p>}

      <AuthSubmitButton
        isSubmitting={isSubmitting}
        pendingLabel={mode === "signup" ? "登録中..." : "ログイン中..."}
      >
        {mode === "signup" ? "登録する" : "ログイン"}
      </AuthSubmitButton>

      <p className="text-center text-xs text-fg-muted">
        {mode === "signup"
          ? "既にアカウントをお持ちの方は "
          : "アカウントをお持ちでない方は "}
        <button
          type="button"
          onClick={() => {
            setError(null);
            onModeChange(mode === "signup" ? "login" : "signup");
          }}
          className="text-accent-soft underline"
        >
          {mode === "signup" ? "ログイン" : "新規登録"}
        </button>
      </p>
    </form>
  );
}

/** isSecureContext は読み込み後に変わらないので、購読は何もしない */
function subscribeToNothing() {
  return () => {};
}
