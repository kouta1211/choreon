import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import { PlaybackControls } from '@/components/playback-controls';
import { SceneDock } from '@/components/scene-dock';
import { StageView } from '@/components/stage-view';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/features/canvas/store/useUIStore';
import { useT } from '@/features/i18n/store/useLocaleStore';
import { useProjectStore } from '@/features/project/store/useProjectStore';
import {
  getSharedProject,
  type SharedProject,
} from '@/features/viewer/api/sharedProject';
import { useThemeColor } from '@/features/theme/lib/useThemeColor';
import { supabase } from '@/lib/supabase/client';

/**
 * 共有リンクを**このアプリで**開いたときの画面。読むだけ。
 *
 * ■ 何のためにあるか
 * 配ったリンクは Web版のビューアを指しているので、相手はブラウザで見られる。
 * ただし**アプリを入れている人**（同じ団体の振付師など）がリンクを踏んだら、
 * ブラウザへ飛ばずにその場で開けた方が早い。
 *
 * ■ 編集の口を1つも置かない
 * ステージ・シーンの帯・通し再生だけを出す。ダンサーを掴んでも動くが、
 * **書き込みは `persist` を通り、`isGuest` なので何も送られない**
 * （相手の作品を書き換えることはない）。それでも紛らわしいので、
 * 画面に「読むだけ」と出している。
 *
 * ■ 権限
 * 4つのテーブルは「自分の作品だけ」の RLS で閉じている。ここが使うのは
 * トークンを受け取る関数1つだけ（`shared_project`）で、テーブルそのものは
 * 閉じたまま（Web版と同じ仕組み）。
 */
export default function SharedViewerScreen() {
  const t = useT();
  const danger = useThemeColor('--dancer-2');
  // **Web版の共有リンクと同じ形**を受ける: /view/<作品id>?t=<トークン>。
  // 作品 id は使わない（トークンだけで引ける）が、同じ URL がそのまま
  // 通るようにしておく — 将来ユニバーサルリンクを設定したときに、
  // 配ったリンクを作り直さずに済む
  const { t: token } = useLocalSearchParams<{ projectId: string; t: string }>();

  const hydrate = useProjectStore((state) => state.hydrate);
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');
  const [stage, setStage] = useState({ width: 14, height: 10 });

  useEffect(() => {
    let alive = true;
    void (async () => {
      const shared: SharedProject | null = await getSharedProject(supabase, token ?? '');
      if (!alive) return;

      if (!shared) {
        setState('missing');
        return;
      }
      // **isGuest で入れる。** これで書き込みの窓口（persist）が
      // 何も送らなくなる — 相手の作品を触ってしまう道を塞ぐ
      hydrate({ ...shared, isGuest: true });
      const first = [...shared.scenes].sort(
        (a, b) => a.timeSeconds - b.timeSeconds || a.orderIndex - b.orderIndex,
      )[0];
      useUIStore.getState().selectScene(first?.id ?? null);
      useUIStore.getState().selectDancer(null);
      setStage({ width: shared.project.stageWidth, height: shared.project.stageHeight });
      setState('ready');
    })();
    return () => {
      alive = false;
    };
  }, [token, hydrate]);

  if (state === 'loading') {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-page">
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (state === 'missing') {
    return (
      <SafeAreaView className="flex-1 items-center justify-center gap-4 bg-page p-6">
        <Text className="text-center text-base" style={{ color: danger }}>
          {t.viewer.missing}
        </Text>
        <Text className="text-center text-xs leading-5 text-fg-muted">
          {t.viewer.missingNote}
        </Text>
        <Button label={t.viewer.back} kind="secondary" onPress={() => router.replace('/')} />
      </SafeAreaView>
    );
  }

  const title = useProjectStore.getState().project?.title ?? '';

  return (
    <SafeAreaView className="flex-1 bg-page">
      <View className="h-14 shrink-0 flex-row items-center gap-2 px-3">
        <Text numberOfLines={1} className="min-w-0 flex-1 text-lg text-fg-strong">
          {title}
        </Text>
        <View className="rounded-full bg-surface-raised px-3 py-1">
          <Text className="text-xs text-fg-sub">{t.viewer.readOnly}</Text>
        </View>
        <Button
          kind="ghost"
          icon="close"
          onPress={() => router.replace('/')}
          accessibilityLabel={t.viewer.back}
        />
      </View>

      <View className="min-h-0 flex-1 px-3">
        <StageView stageWidthUnits={stage.width} stageHeightUnits={stage.height} />
      </View>

      <View className="shrink-0 gap-2 px-3 pt-2">
        <PlaybackControls />
        {/* 「直す」を渡さない = 直す入口を出さない */}
        <SceneDock stageWidthUnits={stage.width} stageHeightUnits={stage.height} />
      </View>
    </SafeAreaView>
  );
}
