import { useEffect } from 'react';

import { useProjectStore } from '@/features/project/store/useProjectStore';
import { saveGuestDraft } from '@/features/project/lib/guestDraft';

/** 触るたびに書かない。指が止まってからまとめて1回 */
const QUIET_MS = 800;

/**
 * 下書きを触るたび、少し待ってから端末へ書き戻す。
 *
 * ■ なぜ待つのか
 * ダンサーを1人引いている間に何十回も位置が変わる。そのたびに書くと、
 * 指の動きと保存が競り合う。**手が止まってから1回**でよい。
 *
 * ■ 下書きのときだけ
 * ログインして開いた作品はサーバーが持っているので、こちらで控えを
 * 作る意味が無い（`isGuest` を見ている）。
 *
 * ■ 購読はストアへ直に
 * `useProjectStore((state) => ...)` で読むと、変わるたびにこの部品も
 * 描き直される。**書き戻すだけで画面には出さない**ので、購読して
 * 待ち時間を置くだけにする。
 */
export function useGuestDraftAutosave() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const unsubscribe = useProjectStore.subscribe((state) => {
      if (!state.isGuest || !state.project) return;

      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const now = useProjectStore.getState();
        // 待っているあいだに作品を開いたかもしれない
        if (!now.isGuest || !now.project) return;

        void saveGuestDraft({
          project: now.project,
          dancers: Object.values(now.dancers),
          scenes: now.scenes,
          positions: now.scenes.flatMap((scene) =>
            Object.values(now.positionsBySceneId[scene.id] ?? {}),
          ),
        });
      }, QUIET_MS);
    });

    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, []);
}
