"use client";

import { useState, type ReactNode } from "react";
import { useProjectStore } from "@/features/project/store/useProjectStore";
import {
  Database,
  Eye,
  Frame,
  Grid2x2,
  Keyboard,
  Play,
  Settings2,
  TriangleAlert,
  UserRoundCog,
} from "lucide-react";
import { BottomSheet } from "@/components/molecules/BottomSheet";
import { SettingsNavRow } from "@/components/molecules/SettingsRow";
import { SettingsApplySurface } from "@/components/molecules/SettingsApplyBar";
import { SettingsDataSection } from "@/components/molecules/SettingsDataSection";
import { SettingsStageSection } from "@/components/organisms/SettingsStageSection";
import { SettingsGridSection } from "@/components/organisms/SettingsGridSection";
import { SettingsPlaybackSection } from "@/components/organisms/SettingsPlaybackSection";
import { SettingsDisplaySection } from "@/components/organisms/SettingsDisplaySection";
import { SettingsWarningsSection } from "@/components/organisms/SettingsWarningsSection";
import { SettingsAppSection } from "@/components/organisms/SettingsAppSection";
import { ShortcutList } from "@/components/molecules/ShortcutList";
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
  | "warnings"
  | "shortcuts"
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
  /* ステージの広さは**作品が開いていれば**触れる。書き出し・取り込みが
     できるか（= ログイン済みか）とは別の話で、ゲストの下書きにも広さはある
     （書き込みは persist() がゲストを見て止める）。
     ここで見るのは「舞台」の要約の書き分けだけ（中身は束が自分で決める） */
  const hasProject = useProjectStore((state) => state.project !== null);
  const isGuest = useProjectStore((state) => state.isGuest);

  // 束の目次。body の要素を作るだけでは中身は動かないので、
  // 開いていない束のぶんは何もしない
  /* 【並びは、触る回数の多い順】(2026-08-20)。
     上から順に「いま画面に見えているもの → この作品のこと → 道具 →
     アプリのこと」。**壊せるもの（データ・アカウント）はいちばん下**に置く。

     - 表示 / 目盛り … 組んでいる最中に何度も切り替える
     - 再生 / 舞台 … 作品ごとに1〜2回決める
     - キーボード操作 … 読むだけ（`?` でも開く）
     - アプリ / データ / アカウント … 最初に1回、あとは滅多に触らない */
  const sections: Section[] = [
    {
      id: "display",
      title: t.settings.display.title,
      summary: t.settings.display.summary,
      icon: <Eye size={20} />,
      body: <SettingsDisplaySection />,
    },
    /* 警告は「表示」の次（2026-09-01）。どちらもステージの見え方の話だが、
       **見せ方と、気づかせる話は分ける** — 切りたいのは後者だけ、という
       場面が多い（user の求めで警告ごとに切れるようにした） */
    {
      id: "warnings",
      title: t.settings.warnings.title,
      summary: t.settings.warnings.summary,
      icon: <TriangleAlert size={20} />,
      body: <SettingsWarningsSection />,
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
    /* 舞台は**作品を開いているときだけ**（2026-08-20）。
       中身はその作品の広さで、ホームには相手が居ない。
       これから作る作品の広さは、作るときの板でその場で決める */
    ...(hasProject
      ? [
          {
            id: "stage" as const,
            title: t.settings.stage.title,
            summary: t.settings.stage.summaryInProject,
            icon: <Frame size={20} />,
            body: <SettingsStageSection />,
          },
        ]
      : []),
    /* キーボード操作は「切り替える設定」ではなく案内だが、**据え置きの
       入口はここが素直**（実機の要望 2026-08-19）。`?` でも同じものが出る */
    {
      id: "shortcuts",
      title: t.settings.shortcuts.title,
      summary: t.settings.shortcuts.summary,
      icon: <Keyboard size={20} />,
      body: <ShortcutList />,
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
      /* ゲストには「別のアカウントで入る・ログアウト」と書かない。
         中身も分けてあるので、束の要約も揃える（実機報告 01-17） */
      summary: isGuest
        ? t.settings.account.summaryGuest
        : t.settings.account.summary,
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
      /* 設定の行は「名前 ＋ 操作」の2つしか無いので、広げすぎると
         その間が間延びする。**一覧の行が読みやすい幅まで**(2026-08-20) */
      wideMaxWidthClassName="min-[1200px]:max-w-2xl"
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
          /* 数を入れる行がある束では、下端に「適用」が貼り付く。
             行ごとにボタンを出したり消したりしない（実機報告 03-17） */
          <SettingsApplySurface>{current.body}</SettingsApplySurface>
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
