"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthScreen } from "@/components/molecules/AuthScreen";
import { AuthForm, type AuthMode } from "@/components/organisms/AuthForm";

/**
 * 新規登録画面。/loginと対になっていて、違いは最初に開く側だけ。
 * 中身の切り替え(ログイン⇄新規登録)はページ遷移せずAuthFormの中で行う。
 */
export default function SignupPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("signup");

  return (
    <AuthScreen>
      <AuthForm
        mode={mode}
        onModeChange={setMode}
        onAuthenticated={() => {
          router.push("/");
          router.refresh();
        }}
      />
    </AuthScreen>
  );
}
