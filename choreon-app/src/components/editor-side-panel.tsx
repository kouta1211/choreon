import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { DancerSheet } from '@/components/dancer-sheet';
import { FormationSheet } from '@/components/formation-sheet';
import { SceneList } from '@/components/scene-list';
import { useProjectStore } from '@/features/project/store/useProjectStore';
import { useT } from '@/features/i18n/store/useLocaleStore';

type Props = {
  stageWidthUnits: number;
  stageHeightUnits: number;
  onEditScene: () => void;
};

type Tab = 'scenes' | 'dancers';

/**
 * ステージの右に出す常設のパネル。**広い画面（タブレット・横向き・
 * ブラウザの窓）でだけ**出る。
 *
 * ■ なぜ広い画面だけなのか
 * 狭い画面では、シーンは下の帯、ダンサーはシートで開く。横に280pxを
 * 割くとステージが小さくなりすぎる（Web版も768pxから出している）。
 *
 * ■ タブで切り替える
 * 横幅がパネル1枚ぶんしか無いので、シーンとダンサーを並べられない
 * （Web版 EditorSidePanel と同じ）。Web版は1200px以上でシーンを左レールへ
 * 出して2枚にするが、そこまでの幅はタブレットでは滅多に無いので
 * ネイティブ版は2ペインまでにしてある。
 *
 * ■ 中身は既にある部品をそのまま置く
 * ダンサーの側は「ダンサー」のシートに入れているものと同じ部品
 * （DancerSheet / FormationSheet）。**同じ操作が場所によって違う、
 * という状態を作らない。**
 */
export function EditorSidePanel({ stageWidthUnits, stageHeightUnits, onEditScene }: Props) {
  const t = useT();
  const [tab, setTab] = useState<Tab>('scenes');
  const scenes = useProjectStore((state) => state.scenes);
  const dancers = useProjectStore((state) => state.dancers);

  const tabs: { value: Tab; label: string }[] = [
    { value: 'scenes', label: `${t.scenes.section}（${scenes.length}）` },
    { value: 'dancers', label: `${t.editor.dancers}（${Object.keys(dancers).length}）` },
  ];

  return (
    <View className="w-72 shrink-0 overflow-hidden rounded-xl border border-line bg-surface">
      <View className="shrink-0 flex-row gap-1 border-b border-line p-2">
        {tabs.map((item) => {
          const isOn = tab === item.value;
          return (
            <Pressable
              key={item.value}
              onPress={() => setTab(item.value)}
              accessibilityRole="tab"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: isOn }}
              className={`h-9 flex-1 items-center justify-center rounded-lg active:opacity-70 ${
                isOn ? 'bg-accent' : ''
              }`}
            >
              <Text className={`text-xs ${isOn ? 'font-semibold text-accent-fg' : 'text-fg-sub'}`}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {tab === 'scenes' ? (
        <SceneList
          stageWidthUnits={stageWidthUnits}
          stageHeightUnits={stageHeightUnits}
          onEditScene={onEditScene}
        />
      ) : (
        <ScrollView
          className="min-h-0 flex-1"
          contentContainerClassName="gap-3 p-3"
          showsVerticalScrollIndicator={false}
        >
          <DancerSheet stageWidthUnits={stageWidthUnits} stageHeightUnits={stageHeightUnits} />
          <FormationSheet stageWidthUnits={stageWidthUnits} stageHeightUnits={stageHeightUnits} />
        </ScrollView>
      )}
    </View>
  );
}
