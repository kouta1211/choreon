"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signInWithPassword } from "@/features/auth/api/auth";
import {
  AuthField,
  AuthScreen,
  AuthSubmitButton,
} from "@/features/auth/components/AuthScreen";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const { error: signInError } = await signInWithPassword(email, password);

    if (signInError) {
      setError("メールアドレスまたはパスワードが正しくありません。");
      setIsSubmitting(false);
      return;
    }

    router.push("/");
    router.refresh();
  };

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
          label="パスワード"
          id="password"
          type="password"
          required
          autoComplete="current-password"
          hasError={error !== null}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        {error && <p className="text-xs text-red-400">{error}</p>}

        <AuthSubmitButton isSubmitting={isSubmitting} pendingLabel="ログイン中...">
          ログイン
        </AuthSubmitButton>

        <p className="text-center text-xs text-zinc-500">
          アカウントをお持ちでない方は{" "}
          <Link href="/signup" className="text-pink-400 underline">
            新規登録
          </Link>
        </p>
      </form>
    </AuthScreen>
  );
}
