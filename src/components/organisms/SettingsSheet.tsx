"use client";

import { useState, type ReactNode } from "react";
import {
  Database,
  Eye,
  Frame,
  Grid2x2,
  Play,
  Settings2,
  UserRoundCog,
} from "lucide-react";
import { BottomSheet } from "@/components/molecules/BottomSheet";
import { SettingsNavRow } from "@/components/molecules/SettingsRow";
import { SettingsDataSection } from "@/components/molecules/SettingsDataSection";
import { SettingsStageSection } from "@/components/organisms/SettingsStageSection";
import { SettingsGridSection } from "@/components/organisms/SettingsGridSection";
import { SettingsPlaybackSection } from "@/components/organisms/SettingsPlaybackSection";
import { SettingsDisplaySection } from "@/components/organisms/SettingsDisplaySection";
import { SettingsAppSection } from "@/components/organisms/SettingsAppSection";
import { SettingsAccountSection } from "@/components/organisms/SettingsAccountSection";
import { useSettingsStore } from "@/features/settings/store/useSettingsStore";
import { useUIStore } from "@/features/canvas/store/useUIStore";
import { useT } from "@/features/i18n/LocaleProvider";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  /** 作品を開いているときだけ渡す。書き出し・取り込み・初期化の対象になる */
  onExport?: () => void;
  onImport?: () => void;
  onResetProject?: () => void;
};

/**
 * この設定がどこまで効くのかを、1枚目にも束の中にも出す。
 *
 * ホームと作品の中で同じ画面が出るので、**どちらで開いたかによって
 * 効く先が変わる**ことは書かないと分からない。書いていなかったときは
 * 「ホームで変えたのに開いている作品が変わらない」と受け取られていた。
 *
 * 作品だけの値を持っているときは件数を出し、やめる道も添える
 * (増やしただけで戻せない設定にしない)。
 */
function ScopeNotice() {
  const t = useT();
  const scope = useSettingsStore((state) => state.scope);
  const overrideCount = useSettingsStore((state) =>
    state.scope ? Object.keys(state.byProject[state.scope] ?? {}).length : 0,
  );
  const clearOverrides = useSettingsStore((state) => state.clearOverrides);
  const showToast = useUIStore((state) => state.showToast);

  return (
    <p className="px-base text-caption leading-relaxed text-fg-muted">
      {scope ? t.settings.scope.project : t.settings.scope.home}
      {scope && ` ${t.settings.scope.newProjectOnly}`}
      {overrideCount > 0 && (
        <>
          <br />
          <span className="text-accent-soft">
            {t.settings.scope.hasOverride(overrideCount)}
          </span>{" "}
          <button
            type="button"
            onClick={() => {
              clearOverrides();
              showToast({
                message: t.settings.scope.cleared,
                type: "success",
              });
            }}
            className="underline underline-offset-2"
          >
            {t.settings.scope.clear}
          </button>
        </>
      )}
    </p>
  );
}

/** 束の名前。開いている束をこれで覚える */
type SectionId =
  | "stage"
  | "grid"
  | "playback"
  | "display"
  | "app"
  | "data"
  | "account";

type Section = {
  id: SectionId;
  title: string;
  /** 一覧に添える「中に何があるか」 */
  summary: string;
  icon: ReactNode;
  body: ReactNode;
};

/**
 * アプリの設定。この部品が持つのは【2階層の殻と、束の目次】だけ。
 * 中身はそれぞれ Settings*Section にある。
 *
 * ■ ここに置くものと、置かないもの
 * ここにあるのは【この端末での作り方】と【新しく作るときの初期値】。
 * いま開いている作品そのものの値(その作品のBPM・ステージの広さ・曲の頭出し)は、
 * 作品と一緒に共有されるものなので、曲のシートやインスペクターに残してある。
 * 同じ名前が2箇所に見えるが、効く相手が違う。
 *
 * ■ 2階層にする
 * 以前は7つの束・22行を1枚に積んでいた。束ねてはあったが、目的の行に着くまで
 * スクロールで探すことになっていた。1枚目は【何が設定できるか】の一覧にして、
 * 選んだ束だけを見せる。一覧の行に中身の名前を添えているのは、
 * 「どの束に入っているか」を開かずに見分けられるようにするため。
 *
 * ■ ストアはここで読まない
 * 束ごとの部品が自分で読む。ここでまとめて読んで配ると、設定を1つ変える
 * たびにシート全体(開いていない束の要素づくりも含めて)描き直される。
 */
export function SettingsSheet({
  isOpen,
  onClose,
  onExport,
  onImport,
  onResetProject,
}: Props) {
  const t = useT();
  const [openSection, setOpenSection] = useState<SectionId | null>(null);

  // 開き直したら必ず一覧から始める。前に見ていた束が出ると、
  // 「探す」ために開いた人が同じ場所に戻される。
  //
  // useEffect で setState する形は使わない。描画が終わってからもう一度
  // 描き直すことになるため。**描画の途中で前回の値と比べて直す**のが
  // React の言う正しい形で、追加の描画は同じ処理の中で片付く
  // (SettingsNumberRow の lastValue と同じ書き方)
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    // 閉じるときには戻さない。退場のアニメーションの最中に中身が
    // 一覧へ入れ替わるのが見えてしまう
    if (isOpen) setOpenSection(null);
  }

  const hasProjectData = Boolean(onExport || onImport || onResetProject);

  // 束の目次。body の要素を作るだけでは中身は動かないので、
  // 開いていない束のぶんは何もしない
  const sections: Section[] = [
    {
      id: "stage",
      title: t.settings.stage.title,
      summary: t.settings.stage.summary,
      icon: <Frame size={20} />,
      body: <SettingsStageSection />,
    },
    {
      id: "grid",
      title: t.settings.grid.title,
      summary: t.settings.grid.summary,
      icon: <Grid2x2 size={20} />,
      body: <SettingsGridSection />,
    },
    {
      id: "playback",
      title: t.settings.playback.title,
      summary: t.settings.playback.summary,
      icon: <Play size={20} />,
      body: <SettingsPlaybackSection />,
    },
    {
      id: "display",
      title: t.settings.display.title,
      summary: t.settings.display.summary,
      icon: <Eye size={20} />,
      body: <SettingsDisplaySection />,
    },
    {
      id: "app",
      title: t.settings.app.title,
      summary: t.settings.app.summary,
      icon: <Settings2 size={20} />,
      body: <SettingsAppSection />,
    },
    // データは作品を開いているときだけ。一覧に行そのものを出さない
    // (開いても何も無い束を見せない)
    ...(hasProjectData
      ? [
          {
            id: "data" as const,
            title: t.settings.data.title,
            summary: t.settings.data.summary,
            icon: <Database size={20} />,
            body: (
              <SettingsDataSection
                onExport={onExport}
                onImport={onImport}
                onResetProject={onResetProject}
              />
            ),
          },
        ]
      : []),
    {
      id: "account",
      title: t.settings.account.title,
      summary: t.settings.account.summary,
      icon: <UserRoundCog size={20} />,
      body: <SettingsAccountSection />,
    },
  ];

  const current = sections.find((section) => section.id === openSection);

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      // 束を開いているときだけ戻る矢印を出す。閉じるのは幕・引き下げ・Escape
      onBack={current ? () => setOpenSection(null) : undefined}
      title={current ? current.title : t.settings.title}
      isTall
    >
      {/* 潜る/戻るを横スライドで見せる。**以前はその場で中身が
          差し替わっていた**ので、1枚目へ戻ったのか別の束へ移ったのかが
          動きから読めなかった。束は右から入り、戻ると右へ出る
          (iOSの設定と同じ向き)。
          key を付け替えて出入りを描き分けている — 同じ要素の中身だけを
          替えると、出て行く方が描かれないので片道しか動かない */}
      <div
        key={openSection ?? "index"}
        className={`flex flex-col gap-gutter-lg px-gutter py-gutter ${
          current ? "settings-pane-in-right" : "settings-pane-in-left"
        }`}
      >
        <ScopeNotice />
        {current ? (
          current.body
        ) : (
          <div className="divide-y divide-line overflow-hidden rounded-2xl bg-surface">
            {sections.map((section) => (
              <SettingsNavRow
                key={section.id}
                label={section.title}
                summary={section.summary}
                icon={section.icon}
                onClick={() => setOpenSection(section.id)}
              />
            ))}
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
