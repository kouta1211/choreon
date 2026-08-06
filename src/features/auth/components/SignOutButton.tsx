"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@/features/auth/api/auth";

export function SignOutButton() {
  const router = useRouter();

  const handleClick = async () => {
    await signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="text-sm text-zinc-600 underline dark:text-zinc-400"
    >
      ログアウト
    </button>
  );
}
