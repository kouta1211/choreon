"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUpWithPassword } from "@/features/auth/api/auth";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/ui/TextField";

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

  if (isEmailSent) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4">
        <Card className="w-full max-w-sm space-y-4 text-center">
          <p className="text-zinc-50">
            確認メールを送信しました。メール内のリンクから登録を完了してください。
          </p>
          <Link href="/login" className="text-sm underline">
            ログイン画面に戻る
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <h1 className="text-xl font-semibold text-zinc-50">
            新規登録
          </h1>

          <TextField
            label="メールアドレス"
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />

          <TextField
            label="パスワード(6文字以上)"
            id="password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "登録中..." : "登録する"}
          </Button>

          <p className="text-center text-sm text-zinc-400">
            既にアカウントをお持ちの方は{" "}
            <Link href="/login" className="underline">
              ログイン
            </Link>
          </p>
        </form>
      </Card>
    </div>
  );
}
