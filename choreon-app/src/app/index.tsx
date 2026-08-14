import { useEffect, useState } from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DancerSheet } from '@/components/dancer-sheet';
import { FormationSheet } from '@/components/formation-sheet';
import { HistoryControls } from '@/components/history-controls';
import { MusicPicker } from '@/components/music-picker';
import { PlaybackControls } from '@/components/playback-controls';
import { SceneDock } from '@/components/scene-dock';
import { SceneEditor } from '@/components/scene-editor';
import { SettingsSheet } from '@/components/settings-sheet';
import { StageView } from '@/components/stage-view';
import { Toast } from '@/components/toast';
import { Button } from '@/components/ui/button';
import { useProjectStore } from '@/features/project/store/useProjectStore';
import { useUIStore } from '@/features/canvas/store/useUIStore';
import { useSettingsStore } from '@/features/settings/store/useSettingsStore';
import { useSessionStore } from '@/features/auth/store/useSessionStore';
import { getT, useLocaleStore, useT } from '@/features/i18n/store/useLocaleStore';

/**
 * 見た目と操作を確かめるための仮データ（まだ Supabase から読んでいない）。
 * シーンを3つ用意してあるのは、**切り替えたときに隊形が動くか**を見るため。
 */
const SAMPLE = {
  stageWidth: 14,
  stageHeight: 10,
  dancers: [
    { id: 'd1', name: 'あかり', color: '#3b82f6' },
    { id: 'd2', name: 'ゆい', color: '#ef4444' },
    { id: 'd3', name: 'かな', color: '#10b981' },
    { id: 'd4', name: 'みお', color: '#f59e0b' },
    { id: 'd5', name: 'りん', color: '#8b5cf6' },
  ],
  scenes: [
    // 横1列＋1人前
    { name: 'シーン1', seconds: 0, at: [[3, 7], [5.5, 7], [8.5, 7], [11, 7], [7, 4]] },
    // V字
    { name: 'シーン2', seconds: 4, at: [[3, 3], [5, 5], [7, 7], [9, 5], [11, 3]] },
    // 円
    { name: 'シーン3', seconds: 8, at: [[7, 2], [10, 5], [8.5, 8], [5.5, 8], [4, 5]] },
  ],
};

/**
 * ネイティブ版の最初の画面。
 *
 * **土台が生きているかを見る盤**と、**最初のステージ1枚**。
 * 確かめているのは:
 *
 *   1. NativeWind ＋ テーマのトークン（Web版と同じクラス名で同じ色が出るか）
 *   2. ストレージ（設定と「表示とモード」が端末に残るか）
 *   3. Supabase（同じ鍵で本物のプロジェクトに届くか）
 *   4. Zustand（Web版からコピーしたストアが動くか）
 *
 * 始めは手書きの仮データで、ログインすると本物の作品に入れ替わる
 * （読むだけ。書き込みはまだ通していない — `account-panel.tsx` 参照）。
 */
export default function FoundationScreen() {
  const t = useT();
  const platform = Platform.OS === 'web' ? 'Web (react-native-web)' : Platform.OS;

  // ステージの広さ。仮のサンプルで始まり、本物の作品を開いたら
  // その作品の広さに入れ替わる（作品ごとに違う）
  const [stage, setStage] = useState({
    width: SAMPLE.stageWidth,
    height: SAMPLE.stageHeight,
  });

  // 端末に覚えてあるものを読む（どちらも Promise。Web版は同期だった）
  const loadSettings = useSettingsStore((state) => state.load);
  const loadView = useUIStore((state) => state.loadViewPreference);
  const loadLocale = useLocaleStore((state) => state.load);

  useEffect(() => {
    void loadSettings();
    void loadView();
    void loadLocale();
  }, [loadSettings, loadView, loadLocale]);

  // 設定は【シートの中】。トグルをここへ直に並べていたのをやめた
  // （束ごとに1画面。settings-sheet.tsx を参照）
  const [isSettingsOpen, setSettingsOpen] = useState(false);

  // 仮の隊形をストアへ入れる（Web版と同じ hydrate を通す）
  const hydrate = useProjectStore((state) => state.hydrate);
  useEffect(() => {
    const now = new Date().toISOString();
    hydrate({
      project: {
        id: 'local',
        userId: 'local',
        title: 'ネイティブ版の下書き',
        stageWidth: SAMPLE.stageWidth,
        stageHeight: SAMPLE.stageHeight,
        musicOffsetSeconds: 0,
        bpm: 120,
        beatsPerBar: 4,
        shareToken: null,
        isShared: false,
        createdAt: now,
        updatedAt: now,
      },
      dancers: SAMPLE.dancers.map((dancer, index) => ({
        id: dancer.id,
        projectId: 'local',
        name: dancer.name,
        color: dancer.color,
        // 0度 = 客席を向く（Web版と同じ既定）
        initialDirection: 0,
        orderIndex: index,
        createdAt: now,
      })),
      scenes: SAMPLE.scenes.map((scene, index) => ({
        id: `scene-${index + 1}`,
        projectId: 'local',
        name: scene.name,
        orderIndex: index,
        timeSeconds: scene.seconds,
      })),
      positions: SAMPLE.scenes.flatMap((scene, index) =>
        SAMPLE.dancers.map((dancer, dancerIndex) => ({
          sceneId: `scene-${index + 1}`,
          dancerId: dancer.id,
          xCoordinate: scene.at[dancerIndex][0],
          yCoordinate: scene.at[dancerIndex][1],
          rotationAngle: 0,
        })),
      ),
      isGuest: true,
    });
    useUIStore.getState().selectScene('scene-1');
  }, [hydrate]);

  // Supabase に届くか。ログインしているかは【ストアから】読む —
  // ここで getSession() を1回だけ呼ぶと、あとでログインしても表示が
  // 「未ログイン」のまま古くなる
  const signedInEmail = useSessionStore((state) => state.email);
  const [reach, setReach] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const response = await fetch(
          `${process.env.EXPO_PUBLIC_SUPABASE_URL}/auth/v1/health`,
          { headers: { apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '' } },
        );
        if (alive) {
          setReach(response.ok ? getT().supabase.reached : getT().supabase.failed(response.status));
        }
      } catch {
        if (alive) setReach(getT().supabase.offline);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-page">
      <ScrollView contentContainerClassName="gap-5 p-5">
        <View className="flex-row items-center justify-between gap-3">
          <View className="min-w-0 flex-1 gap-1">
            <Text className="text-3xl font-bold tracking-tight text-fg-strong">
              {t.app.title}
            </Text>
            <Text className="text-sm text-fg-muted">{t.app.subtitle}</Text>
          </View>
          <Button
            icon="sliders"
            onPress={() => setSettingsOpen(true)}
            accessibilityLabel={t.settings.title}
          />
        </View>

        <StageView stageWidthUnits={stage.width} stageHeightUnits={stage.height} />

        {/* 保存に失敗したときの知らせ。ステージのすぐ下に出す */}
        <Toast />

        <PlaybackControls />

        <HistoryControls />

        <MusicPicker />

        <SceneDock />

        <SceneEditor />

        <DancerSheet stageWidthUnits={stage.width} stageHeightUnits={stage.height} />

        <FormationSheet stageWidthUnits={stage.width} stageHeightUnits={stage.height} />

        <View className="gap-1 rounded-2xl border border-line bg-surface p-4">
          <Text className="text-xs uppercase tracking-widest text-fg-muted">
            {t.supabase.section}
          </Text>
          <Text className="text-base text-fg-strong">
            {reach === null
              ? t.supabase.checking
              : `${reach}（${signedInEmail ? t.supabase.signedIn : t.supabase.signedOut}）`}
          </Text>
          <Text className="text-xs text-fg-muted">
            {t.supabase.platform}: {platform}
          </Text>
        </View>
      </ScrollView>

      <SettingsSheet
        isOpen={isSettingsOpen}
        onClose={() => setSettingsOpen(false)}
        onProjectLoaded={setStage}
      />
    </SafeAreaView>
  );
}
