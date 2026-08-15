import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import { PlaybackControls } from '@/components/playback-controls';
import { SceneDock } from '@/components/scene-dock';
import { StageView } from '@/components/stage-view';
import { ViewerEntry } from '@/components/viewer-entry';
import { ViewerRoute } from '@/components/viewer-route';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/features/canvas/store/useUIStore';
import { useT } from '@/features/i18n/store/useLocaleStore';
import { useProjectStore } from '@/features/project/store/useProjectStore';
import {
  getSharedProject,
  type SharedProject,
} from '@/features/viewer/api/sharedProject';
import {
  loadFocusedDancerId,
  saveFocusedDancerId,
} from '@/features/viewer/lib/focusPreference';
import { useThemeColor } from '@/features/theme/lib/useThemeColor';
import { supabase } from '@/lib/supabase/client';

/**
 * 共有リンクを**このアプリで**開いたときの画面。読むだけ。
 *
 * ■ 3つの段
 *   1. 読み込み
 *   2. **あなたはどれですか**（自分のポジションを選ぶ）
 *   3. ステージ＋道順（選んだ人だけ濃く、動きは言葉で）
 *
 * 2段目を挟むのは、踊る人がこのリンクを開く目的が
 * 「**自分がどこへ動くか**を確かめる」ことだから。全員の丸が並んだ
 * ステージをいきなり出しても、自分を目で探すところから始まる。
 * 一度選べば端末が覚えるので、次に同じ作品を開いたら飛ばす。
 *
 * ■ 編集の口を1つも置かない
 * ステージ・シーンの帯・通し再生・道順だけ。**`isGuest` で入れてある**
 * ので、仮に何か触っても `persist` が何も送らない（相手の作品を書き換える
 * 道がそもそも無い）。それでも紛らわしいので「読むだけ」と出している。
 *
 * ■ 権限
 * 4つのテーブルは「自分の作品だけ」の RLS で閉じたまま。使うのはトークンを
 * 受け取る関数1つ（`shared_project`）だけ（Web版と同じ仕組み）。
 */
export default function SharedViewerScreen() {
  const t = useT();
  const danger = useThemeColor('--dancer-2');

  // **Web版の共有リンクと同じ形**を受ける: /view/<作品id>?t=<トークン>&p=<ポジション>。
  // 作品 id は使わない（トークンだけで引ける）が、同じ URL がそのまま
  // 通るようにしておく — 将来ユニバーサルリンクを設定したときに、
  // 配ったリンクを作り直さずに済む
  const { t: token, p: linkedDancerId } = useLocalSearchParams<{
    projectId: string;
    t: string;
    p?: string;
  }>();

  const hydrate = useProjectStore((state) => state.hydrate);
  const setFocusedDancer = useUIStore((state) => state.setFocusedDancer);
  const focusedDancerId = useUIStore((state) => state.focusedDancerId);

  const [state, setState] = useState<'loading' | 'asking' | 'ready' | 'missing'>('loading');
  const [stage, setStage] = useState({ width: 14, height: 10 });
  const [projectId, setProjectId] = useState<string | null>(null);

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
      setProjectId(shared.project.id);

      // リンクに ?p= が付いていればそちらが勝つ（振付師が一人ひとりに
      // 違うリンクを配れる）。無ければ、前に選んだものを端末から戻す
      const remembered = await loadFocusedDancerId(shared.project.id);
      const picked =
        linkedDancerId && shared.dancers.some((dancer) => dancer.id === linkedDancerId)
          ? linkedDancerId
          : remembered;
      if (!alive) return;

      if (picked && shared.dancers.some((dancer) => dancer.id === picked)) {
        setFocusedDancer(picked);
        void saveFocusedDancerId(shared.project.id, picked);
        setState('ready');
      } else {
        setState('asking');
      }
    })();
    return () => {
      alive = false;
    };
  }, [token, linkedDancerId, hydrate, setFocusedDancer]);

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

  if (state === 'asking') {
    return (
      <SafeAreaView className="flex-1 bg-page">
        <ViewerEntry
          onPick={(dancerId) => {
            setFocusedDancer(dancerId);
            if (projectId) void saveFocusedDancerId(projectId, dancerId);
            setState('ready');
          }}
          onSkip={() => {
            setFocusedDancer(null);
            setState('ready');
          }}
        />
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

      <ScrollView contentContainerClassName="gap-2 px-3 pb-3" showsVerticalScrollIndicator={false}>
        {/* ステージは高さを決め打ちにする。下に道順が続くので、
            エディタのように「余った高さを全部」取らせると読めなくなる */}
        <View style={{ height: 260 }}>
          <StageView stageWidthUnits={stage.width} stageHeightUnits={stage.height} />
        </View>

        <PlaybackControls />

        {/* 「直す」を渡さない = 直す入口を出さない */}
        <SceneDock
          stageWidthUnits={stage.width}
          stageHeightUnits={stage.height}
          isReadOnly
        />

        <ViewerRoute
          focusedDancerId={focusedDancerId}
          onReselect={() => setState('asking')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
