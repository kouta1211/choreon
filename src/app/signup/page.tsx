"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail } from "lucide-react";
import { signUpWithPassword } from "@/features/auth/api/auth";
import {
  AuthField,
  AuthScreen,
  AuthSubmitButton,
} from "@/components/molecules/AuthScreen";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

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

    if (data.session) {
      // Supabase側でメール確認を無効にしている場合、登録と同時にログイン状態になる
      router.push("/");
      router.refresh();
      return;
    }

    setIsEmailSent(true);
    setIsSubmitting(false);
  };

  // 送信後はフォームごと差し替える。入力欄が残っていると、もう一度
  // 送るべきなのかメールを待つべきなのかが分からなくなるため
  if (isEmailSent) {
    return (
      <AuthScreen>
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <span
            aria-hidden
            className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-600/16 text-emerald-400"
          >
            <Mail size={20} />
          </span>
          <p className="text-sm font-medium text-zinc-50">
            確認メールを送信しました。
          </p>
          <p className="text-xs leading-relaxed text-zinc-500">
            メール内のリンクを開くと登録が完了します。
          </p>
          <Link
            href="/login"
            className="mt-1 text-xs text-pink-400 underline"
          >
            ログイン画面に戻る
          </Link>
        </div>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen>
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <AuthField
          label="メールアドレス"
          id="email"
          type="email"
          required
          autoComplete="email"
          hasError={error !== null}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <AuthField
          label="パスワード(6文字以上)"
          id="password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          hasError={error !== null}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        {error && <p className="text-xs text-red-400">{error}</p>}

        <AuthSubmitButton isSubmitting={isSubmitting} pendingLabel="登録中...">
          登録する
        </AuthSubmitButton>

        <p className="text-center text-xs text-zinc-500">
          既にアカウントをお持ちの方は{" "}
          <Link href="/login" className="text-pink-400 underline">
            ログイン
          </Link>
        </p>
      </form>
    </AuthScreen>
  );
}
