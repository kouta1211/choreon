import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { vars } from 'nativewind';

import { Icon, type IconName } from '@/components/ui/icon';
import { Segment } from '@/components/ui/button';
import { SwitchTrack } from '@/components/ui/switch';
import { useUIStore } from '@/features/canvas/store/useUIStore';
import { useTourTarget } from '@/features/tutorial/lib/tourTargets';
import { useT } from '@/features/i18n/store/useLocaleStore';
import { THEME_VARS } from '@/features/theme/themeVars.generated';
import { useCurrentTheme } from '@/features/theme/store/useThemeStore';

type Props = {
  onOpenMusic: () => void;
  onOpenSettings: () => void;
};

/**
 * ステージの見え方と、たまにしか開かないものを畳んだメニュー。
 * ヘッダーの右端から開く。
 *
 * ■ なぜ畳むのか
 * ヘッダーにアイコンを4つ並べていた（ダンサー・隊形・曲・設定）。
 * Web版には「アイコンを4つ以上並べない」という決めがあり、常設するのは
 * **ステージを触っている最中に使うもの**だけにして、残りを畳んでいる。
 * こちらも同じにした — 常設はダンサーと隊形、曲と設定はここへ。
 *
 * ■ 見え方のスイッチもここに置く
 * 導線・バミリ・顔被り・払って送るは、これまで 設定 → 表示 まで
 * 3タップ潜らないと触れなかった。**振付を組んでいる最中に何度も
 * 切り替えるもの**なので、設定の奥にあるのは遠い。設定側にも同じ
 * スイッチは残る（どちらも同じ状態を指す。控えは作らない）。
 *
 * ■ 畳むと状態が見えなくなるぶん、数を出す
 * 格子・導線・バミリはステージ自体に出るので実害は小さいが、
 * 「顔被りチェックがオンだが誰も被っていない」だけは見分けが付かない。
 * オンの数をボタンに小さく添える（Web版と同じ考え）。
 *
 * ■ 位置は右上に固定
 * ボタンの実寸を測って合わせる作りにはしていない。ヘッダーの右端に
 * 固定で出す（開く相手が1つしかないので、測る意味がない）。
 */
export function DisplayModeMenu({ onOpenMusic, onOpenSettings }: Props) {
  const t = useT();
  const theme = useCurrentTheme();
  const insets = useSafeAreaInsets();
  const [isOpen, setIsOpen] = useState(false);

  const gridMode = useUIStore((state) => state.gridMode);
  const setGridMode = useUIStore((state) => state.setGridMode);
  const isPathVisible = useUIStore((state) => state.isPathVisible);
  const togglePathVisible = useUIStore((state) => state.togglePathVisible);
  const isStageMarksVisible = useUIStore((state) => state.isStageMarksVisible);
  const toggleStageMarks = useUIStore((state) => state.toggleStageMarks);
  const isBlindSpotCheckVisible = useUIStore((state) => state.isBlindSpotCheckVisible);
  const toggleBlindSpotCheck = useUIStore((state) => state.toggleBlindSpotCheck);
  const isSwipeSceneChangeEnabled = useUIStore((state) => state.isSwipeSceneChangeEnabled);
  const toggleSwipeSceneChange = useUIStore((state) => state.toggleSwipeSceneChange);
  const isMetronomeEnabled = useUIStore((state) => state.isMetronomeEnabled);
  const toggleMetronome = useUIStore((state) => state.toggleMetronome);
  const requestTour = useUIStore((state) => state.requestTour);
  // 案内の最後の段が指す先。この入口そのものを指すので、
  // 「もう一度見るのはここから」がその場で分かる
  const menuRef = useTourTarget('display-menu');

  const switches = [
    // 稽古中に何度も切り替えるもの。設定の奥ではなくここに置く
    {
      label: t.playback.metronome,
      checked: isMetronomeEnabled,
      onToggle: toggleMetronome,
    },
    {
      label: t.settings.display.path.label,
      checked: isPathVisible,
      onToggle: togglePathVisible,
    },
    {
      label: t.settings.display.stageMarks.label,
      checked: isStageMarksVisible,
      onToggle: toggleStageMarks,
    },
    {
      label: t.settings.display.blindSpot.label,
      checked: isBlindSpotCheckVisible,
      onToggle: toggleBlindSpotCheck,
    },
    {
      label: t.settings.display.swipe.label,
      checked: isSwipeSceneChangeEnabled,
      onToggle: toggleSwipeSceneChange,
    },
  ];

  const onCount =
    switches.filter((item) => item.checked).length + (gridMode === 'square' ? 1 : 0);

  const close = () => setIsOpen(false);
  const openAnd = (run: () => void) => {
    close();
    run();
  };

  return (
    <>
      <Pressable
        ref={menuRef}
        onPress={() => setIsOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={t.editor.menu}
        className="h-11 w-11 items-center justify-center rounded-full active:opacity-70"
      >
        <Icon name="sliders" size={18} tone="--text-sub" />
        {onCount > 0 ? (
          <View className="absolute top-1 right-1 h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1">
            <Text className="font-mono text-[9px] text-accent-fg">
              {t.editor.menuBadge(onCount)}
            </Text>
          </View>
        ) : null}
      </Pressable>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={close}
        statusBarTranslucent
      >
        {/* Modal はテーマの外側に描かれるので、ここでも当てる */}
        <View style={vars(THEME_VARS[theme])} className="flex-1">
          <Pressable
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel={t.common.close}
            className="absolute inset-0 bg-scrim opacity-40"
          />

          <View
            style={{ top: insets.top + 52 }}
            className="absolute right-3 w-64 overflow-hidden rounded-2xl border border-line bg-page"
          >
            {/* 不透明な地の上に板の色を重ねる（sheet.tsx と同じ理由） */}
            <View pointerEvents="none" className="absolute inset-0 bg-surface" />

            <MenuLabel text={t.editor.menuView} />

            <View className="min-h-11 flex-row items-center gap-3 px-3 py-2">
              <Text className="min-w-0 flex-1 text-sm text-fg-strong">
                {t.settings.grid.mode.label}
              </Text>
              <Segment
                value={gridMode}
                options={[
                  { value: 'square' as const, label: t.settings.grid.mode.square },
                  { value: 'none' as const, label: t.settings.grid.mode.none },
                ]}
                onChange={setGridMode}
                accessibilityLabel={t.settings.grid.mode.label}
              />
            </View>

            {switches.map((item) => (
              <Pressable
                key={item.label}
                onPress={item.onToggle}
                accessibilityRole="switch"
                accessibilityLabel={item.label}
                // 読み上げ用。web は accessibilityState を変換しないので両方
                accessibilityState={{ checked: item.checked }}
                aria-checked={item.checked}
                className="min-h-11 flex-row items-center gap-3 border-t border-line px-3 py-2 active:opacity-70"
              >
                <Text className="min-w-0 flex-1 text-sm text-fg-strong">{item.label}</Text>
                <SwitchTrack checked={item.checked} />
              </Pressable>
            ))}

            <MenuLabel text={t.editor.menuOpen} hasBorder />

            <MenuRow icon="music" label={t.editor.music} onPress={() => openAnd(onOpenMusic)} />
            <MenuRow
              icon="sliders"
              label={t.settings.title}
              onPress={() => openAnd(onOpenSettings)}
              hasBorder
            />
            {/* 案内は「初回だけ自動」なので、あとから見たい人の道が要る。
                閉じてから頼む — 開いたままだと、指す先がこのメニューに
                隠れてしまう */}
            <MenuRow
              icon="help"
              label={t.tour.replay}
              onPress={() => openAnd(requestTour)}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

function MenuLabel({ text, hasBorder = false }: { text: string; hasBorder?: boolean }) {
  return (
    <Text
      className={`px-3 pt-2.5 pb-1 text-[10px] uppercase tracking-widest text-fg-muted ${
        hasBorder ? 'border-t border-line' : ''
      }`}
    >
      {text}
    </Text>
  );
}

function MenuRow({
  icon,
  label,
  onPress,
  hasBorder = false,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  hasBorder?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className={`min-h-11 flex-row items-center gap-3 px-3 py-2 active:opacity-70 ${
        hasBorder ? 'border-t border-line' : ''
      }`}
    >
      <Icon name={icon} size={18} />
      <Text className="min-w-0 flex-1 text-sm text-fg-strong">{label}</Text>
      <Icon name="chevron-right" size={16} />
    </Pressable>
  );
}
