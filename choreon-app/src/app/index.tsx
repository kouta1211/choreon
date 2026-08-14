import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AccountPanel } from '@/components/account-panel';
import { DancerSheet } from '@/components/dancer-sheet';
import { FormationSheet } from '@/components/formation-sheet';
import { HistoryControls } from '@/components/history-controls';
import { MusicPicker } from '@/components/music-picker';
import { PlaybackControls } from '@/components/playback-controls';
import { SceneDock } from '@/components/scene-dock';
import { SceneEditor } from '@/components/scene-editor';
import { StageView } from '@/components/stage-view';
import { ThemePicker } from '@/components/theme-picker';
import { Toast } from '@/components/toast';
import { useProjectStore } from '@/features/project/store/useProjectStore';
import { useUIStore } from '@/features/canvas/store/useUIStore';
import { useSettingsStore } from '@/features/settings/store/useSettingsStore';
import { useSessionStore } from '@/features/auth/store/useSessionStore';

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
  const isLoaded = useSettingsStore((state) => state.isLoaded);

  useEffect(() => {
    void loadSettings();
    void loadView();
  }, [loadSettings, loadView]);

  // 設定と表示のトグル
  const isAudienceOnTop = useSettingsStore((state) => state.isAudienceOnTop);
  const dancerNameDisplay = useSettingsStore((state) => state.dancerNameDisplay);
  const update = useSettingsStore((state) => state.update);
  const gridMode = useUIStore((state) => state.gridMode);
  const setGridMode = useUIStore((state) => state.setGridMode);
  const isSwipeEnabled = useUIStore((state) => state.isSwipeSceneChangeEnabled);
  const toggleSwipe = useUIStore((state) => state.toggleSwipeSceneChange);
  const isBlindSpotVisible = useUIStore((state) => state.isBlindSpotCheckVisible);
  const isPathVisible = useUIStore((state) => state.isPathVisible);
  const togglePathVisible = useUIStore((state) => state.togglePathVisible);
  const isStageMarksVisible = useUIStore((state) => state.isStageMarksVisible);
  const toggleStageMarks = useUIStore((state) => state.toggleStageMarks);
  const toggleBlindSpotCheck = useUIStore((state) => state.toggleBlindSpotCheck);

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
        if (alive) setReach(response.ok ? '届いた' : `届かない（${response.status}）`);
      } catch {
        if (alive) setReach('届かない（通信できませんでした）');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-page">
      <ScrollView contentContainerClassName="gap-5 p-5">
        <View className="gap-1">
          <Text className="text-3xl font-bold tracking-tight text-fg-strong">Choreon</Text>
          <Text className="text-sm text-fg-muted">ネイティブ版の土台</Text>
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

        <AccountPanel onProjectLoaded={setStage} />

        <ThemePicker />

        {/* 端末に覚えるもの。切り替えてから再読み込みしても残る */}
        <View className="gap-3 rounded-2xl border border-line bg-surface p-4">
          <Text className="text-xs uppercase tracking-widest text-fg-muted">
            端末に覚える{isLoaded ? '' : '（読み込み中）'}
          </Text>

          <Toggle
            label="客席を上にする"
            value={isAudienceOnTop ? 'オン' : 'オフ'}
            onPress={() => update('isAudienceOnTop', !isAudienceOnTop)}
          />
          <Toggle
            label="ダンサー名"
            value={dancerNameDisplay === 'always' ? '常に' : '出さない'}
            onPress={() =>
              update('dancerNameDisplay', dancerNameDisplay === 'always' ? 'never' : 'always')
            }
          />
          <Toggle
            label="目盛り"
            value={gridMode === 'square' ? '格子' : 'なし'}
            onPress={() => setGridMode(gridMode === 'square' ? 'none' : 'square')}
          />
          {/* 指のある端末では既定でオン、マウスでは既定でオフ
              (Web版 defaultViewPreference と同じ判断) */}
          <Toggle
            label="払ってシーンを送る"
            value={isSwipeEnabled ? 'オン' : 'オフ'}
            onPress={toggleSwipe}
          />
          <Toggle
            label="導線を出す"
            value={isPathVisible ? 'オン' : 'オフ'}
            onPress={togglePathVisible}
          />
          <Toggle
            label="バミリ（客席側の目盛り）"
            value={isStageMarksVisible ? 'オン' : 'オフ'}
            onPress={toggleStageMarks}
          />
          <Toggle
            label="顔被りを見つける"
            value={isBlindSpotVisible ? 'オン' : 'オフ'}
            onPress={toggleBlindSpotCheck}
          />

          <Text className="text-xs leading-5 text-fg-muted">
            丸の肩に付く印: <Text className="text-fg-sub">顔</Text>＝手前の人に隠れている／
            <Text className="text-fg-sub">数字</Text>＝次のシーンへの移動が速すぎる（m/s。
            3.5 を超えると付く）。速さの印は<Text className="text-fg-sub">常に</Text>出ます。
          </Text>

          <Text className="text-xs leading-5 text-fg-muted">
            上2つは設定（settings）、目盛りは「表示とモード」（viewPreference）。
            どちらも Web は localStorage、iOS/Android は AsyncStorage へ書いています。
          </Text>
        </View>

        <View className="gap-1 rounded-2xl border border-line bg-surface p-4">
          <Text className="text-xs uppercase tracking-widest text-fg-muted">Supabase</Text>
          <Text className="text-base text-fg-strong">
            {reach === null
              ? '確かめています…'
              : `${reach}（${signedInEmail ? 'ログイン中' : '未ログイン'}）`}
          </Text>
          <Text className="text-xs text-fg-muted">環境: {platform}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Toggle({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between rounded-xl bg-surface-raised px-4 py-3 active:opacity-80"
    >
      <Text className="text-base text-fg">{label}</Text>
      <Text className="text-base font-semibold text-accent-soft">{value}</Text>
    </Pressable>
  );
}
