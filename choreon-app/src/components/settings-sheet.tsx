import { useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';

import { Sheet } from '@/components/ui/sheet';
import { SettingsNavRow } from '@/components/ui/settings-row';
import type { IconName } from '@/components/ui/icon';
import { SettingsStageSection } from '@/components/settings/stage-section';
import { SettingsGridSection } from '@/components/settings/grid-section';
import { SettingsPlaybackSection } from '@/components/settings/playback-section';
import { SettingsDisplaySection } from '@/components/settings/display-section';
import { SettingsAppSection } from '@/components/settings/app-section';
import { SettingsAccountSection } from '@/components/settings/account-section';
import { useSettingsStore } from '@/features/settings/store/useSettingsStore';
import { useT } from '@/features/i18n/store/useLocaleStore';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onProjectLoaded: (stage: { width: number; height: number }) => void;
};

type SectionId = 'stage' | 'grid' | 'playback' | 'display' | 'app' | 'account';

type Section = {
  id: SectionId;
  title: string;
  /** 一覧に添える「中に何があるか」 */
  summary: string;
  icon: IconName;
  body: ReactNode;
};

/**
 * アプリの設定。この部品が持つのは【2階層の殻と、束の目次】だけ。
 * 中身はそれぞれ settings/*-section.tsx にある（Web版 SettingsSheet と同じ形）。
 *
 * ■ 2階層にする
 * 以前のネイティブ版は7つのトグルを1枚の画面へ積んでいて、その下に
 * テーマ・言語・アカウントのカードが続いていた。目的の項目に着くまで
 * スクロールで探すことになる。1枚目は【何が設定できるか】の一覧にして、
 * 選んだ束だけを見せる。一覧の行に中身の名前を添えているのは、
 * 「どの束に入っているか」を開かずに見分けられるようにするため。
 *
 * ■ ストアはここで読まない
 * 束ごとの部品が自分で読む。ここでまとめて読んで配ると、設定を1つ変える
 * たびにシート全体（開いていない束の要素づくりも含めて）描き直される。
 * 読んでいるのは「まだ端末から読み終えていない」の1つだけ。
 */
export function SettingsSheet({ isOpen, onClose, onProjectLoaded }: Props) {
  const t = useT();
  const isLoaded = useSettingsStore((state) => state.isLoaded);
  const [openSection, setOpenSection] = useState<SectionId | null>(null);

  // 開き直したら必ず一覧から始める。前に見ていた束が出ると、
  // 「探す」ために開いた人が同じ場所に戻される。
  //
  // useEffect で setState する形は使わない。描画が終わってからもう一度
  // 描き直すことになるため。**描画の途中で前回の値と比べて直す**のが
  // React の言う正しい形（SettingsNumberRow の lastValue と同じ書き方）
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    // 閉じるときには戻さない。消える途中で中身が一覧へ入れ替わるのが見える
    if (isOpen) setOpenSection(null);
  }

  const sections: Section[] = [
    {
      id: 'stage',
      title: t.settings.stage.title,
      summary: t.settings.stage.summary,
      icon: 'frame',
      body: <SettingsStageSection />,
    },
    {
      id: 'grid',
      title: t.settings.grid.title,
      summary: t.settings.grid.summary,
      icon: 'grid',
      body: <SettingsGridSection />,
    },
    {
      id: 'playback',
      title: t.settings.playback.title,
      summary: t.settings.playback.summary,
      icon: 'play',
      body: <SettingsPlaybackSection />,
    },
    {
      id: 'display',
      title: t.settings.display.title,
      summary: t.settings.display.summary,
      icon: 'eye',
      body: <SettingsDisplaySection />,
    },
    {
      id: 'app',
      title: t.settings.app.title,
      summary: t.settings.app.summary,
      icon: 'palette',
      body: <SettingsAppSection />,
    },
    {
      id: 'account',
      title: t.settings.account.title,
      summary: t.settings.account.summary,
      icon: 'user',
      body: <SettingsAccountSection onProjectLoaded={onProjectLoaded} />,
    },
  ];

  const current = sections.find((section) => section.id === openSection);

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      // 束を開いているときだけ戻る矢印を出す
      onBack={current ? () => setOpenSection(null) : undefined}
      title={current ? current.title : `${t.settings.title}${isLoaded ? '' : t.settings.loading}`}
      isTall
    >
      {current ? (
        current.body
      ) : (
        <>
          <View className="overflow-hidden rounded-2xl bg-surface">
            {sections.map((section, index) => (
              <View key={section.id}>
                {index > 0 ? <View className="h-px bg-line" /> : null}
                <SettingsNavRow
                  label={section.title}
                  summary={section.summary}
                  icon={section.icon}
                  onPress={() => setOpenSection(section.id)}
                />
              </View>
            ))}
          </View>

          <Text className="px-1 text-xs leading-5 text-fg-muted">
            {t.settings.storageNote}
          </Text>
        </>
      )}
    </Sheet>
  );
}
