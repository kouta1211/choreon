"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { PressableButton } from "@/components/atoms/PressableButton";
import { useT } from "@/features/i18n/LocaleProvider";

/** 数を入れる行が預けるもの。「打ち替えがあるか」と「確定させる手」 */
type Entry = { isDirty: boolean; commit: () => void };

type Registry = {
  register: (id: string, entry: { current: Entry }) => void;
  unregister: (id: string) => void;
  setDirty: (id: string, isDirty: boolean) => void;
};

/** 預かり口。**中身が変わらない**ので、行がこれで描き直されることは無い */
const ApplyRegistry = createContext<Registry | null>(null);

/**
 * 設定の束の下に貼り付く「適用」。
 *
 * ■ なぜ行ごとのボタンをやめたのか
 * 打ち替えている間だけ行の中にボタンを出していた。押す必要があるときだけ
 * 出る、という意図だったが、**出たり消えたりで行の高さが動く**。
 * 「いちいち表示されるのがうざい」という指摘（実機報告 03-17）はここ。
 *
 * 束の下に1つ置いて、**居場所を動かさない**。押せるものが無いときは
 * 押せない見た目のまま残す — 消すと、結局「出たり消えたり」に戻る。
 *
 * ■ 数を入れる行が1つも無い束には出さない
 * 目盛り・表示のようにスイッチだけの束では、押しても何も起きない。
 * そこに常設すると、押しても反応しないボタンを置くことになる。
 *
 * ■ 描き直しの範囲
 * 預かり口(Registry)は作り直さないので、行はここから描き直されない。
 * 数が変わったときだけこの部品が描き直り、`children` は同じ要素のままなので
 * React が中身の描き直しを省く（1文字打つたびに束ぜんぶが描き直る、
 * ということにはならない）。
 */
export function SettingsApplySurface({ children }: { children: ReactNode }) {
  const t = useT();
  /* 手そのものは ref で預かる。commit は描画のたびに新しくなるので、
     state に入れると打つたびにここが描き直る */
  const entries = useRef(new Map<string, { current: Entry }>());
  const [ids, setIds] = useState<string[]>([]);
  const [dirtyIds, setDirtyIds] = useState<string[]>([]);

  const registry = useMemo<Registry>(
    () => ({
      register: (id, entry) => {
        entries.current.set(id, entry);
        setIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
      },
      unregister: (id) => {
        entries.current.delete(id);
        setIds((prev) => prev.filter((one) => one !== id));
        setDirtyIds((prev) => prev.filter((one) => one !== id));
      },
      setDirty: (id, isDirty) =>
        setDirtyIds((prev) => {
          if (prev.includes(id) === isDirty) return prev;
          return isDirty ? [...prev, id] : prev.filter((one) => one !== id);
        }),
    }),
    [],
  );

  const applyAll = useCallback(() => {
    /* 並んでいる順（上の行から）に確定させる。行どうしが同じものを
       書き換える場合があるので、順番が読める形にしておく */
    for (const entry of entries.current.values()) {
      if (entry.current.isDirty) entry.current.commit();
    }
  }, []);

  const count = dirtyIds.length;

  return (
    <ApplyRegistry.Provider value={registry}>
      {children}
      {ids.length > 0 && (
        /* 下端に貼り付ける。束が長くてもボタンは同じ場所に居る
           （テンプレートのシートと同じ作り） */
        <div className="sticky bottom-0 -mx-gutter -mb-gutter bg-surface/95 px-gutter pt-2 pb-gutter backdrop-blur">
          <PressableButton
            kind="primary"
            onClick={applyAll}
            disabled={count === 0}
            className="flex h-11 w-full items-center justify-center rounded-[calc(var(--radius)*0.6)] border border-accent bg-accent/12 text-label font-semibold text-accent-soft disabled:border-line-strong disabled:bg-transparent disabled:text-fg-muted"
          >
            {count === 0
              ? t.common.numberField.apply
              : t.common.numberField.applyCount(count)}
          </PressableButton>
        </div>
      )}
    </ApplyRegistry.Provider>
  );
}

/**
 * 数を入れる行から、下の「適用」へ手を預ける。
 *
 * 戻り値は**預け先があったか**。無ければ（設定の外で使われたら）
 * 行が自分でボタンを出す。
 */
export function useSettingsApply(isDirty: boolean, commit: () => void) {
  const registry = useContext(ApplyRegistry);
  const id = useId();
  const latest = useRef<Entry>({ isDirty, commit });

  // 描画のたびに最新の手へ差し替える。ref なので、これで描き直しは起きない
  useEffect(() => {
    latest.current = { isDirty, commit };
  });

  useEffect(() => {
    if (!registry) return;
    registry.register(id, latest);
    return () => registry.unregister(id);
  }, [registry, id]);

  // 件数が動くのは打ち始めと確定のときだけ。1文字ごとには動かない
  useEffect(() => {
    registry?.setDirty(id, isDirty);
  }, [registry, id, isDirty]);

  return registry !== null;
}
