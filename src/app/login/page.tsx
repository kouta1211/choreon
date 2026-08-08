"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthScreen } from "@/components/molecules/AuthScreen";
import { AuthForm, type AuthMode } from "@/components/organisms/AuthForm";

/**
 * ログイン画面。通常の導線はエディタ上のモーダル(AuthDialog)だが、
 * ブックマークやメールのリンクから直接来る人のためにページも残している。
 *
 * フォーム本体はモーダルと同じAuthFormを使う。ここが持つのは
 * 「認証できたらトップへ移動する」というこの画面ぶんの後始末だけ。
 */
export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");

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
