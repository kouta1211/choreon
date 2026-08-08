"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@/features/auth/api/auth";

export function SignOutButton() {
  const router = useRouter();

  // ログアウト後の行き先はトップページ。未ログインでも触れるエディタなので、
  // 「ログアウトしたら何も無い画面」にはならない。以前はここで/loginへ
  // 送っていたが、いまは未ログインでも本編を使えるため送る理由が無い
  const handleClick = async () => {
    await signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="text-sm text-zinc-400 underline"
    >
      ログアウト
    </button>
  );
}
