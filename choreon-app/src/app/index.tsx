import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { DancerInspector } from '@/components/dancer-inspector';
import { DancerSheet } from '@/components/dancer-sheet';
import { EditorShortcuts } from '@/components/editor-shortcuts';
import { EditorTour } from '@/components/editor-tour';
import { EditorHeader } from '@/components/editor-header';
import { EditorSidePanel } from '@/components/editor-side-panel';
import { FormationSheet } from '@/components/formation-sheet';
import { HistoryControls } from '@/components/history-controls';
import { MusicPicker } from '@/components/music-picker';
import { MusicTimeline } from '@/components/music-timeline';
import { PlaybackControls } from '@/components/playback-controls';
import { SongSettings } from '@/components/song-settings';
import { WelcomeScreen } from '@/components/welcome-screen';
import { useSessionStore } from '@/features/auth/store/useSessionStore';
import { loadGuestDraft } from '@/features/project/lib/guestDraft';
import { useGuestDraftAutosave } from '@/features/project/hooks/useGuestDraftAutosave';
import { SceneDock } from '@/components/scene-dock';
import { SceneEditor } from '@/components/scene-editor';
import { SettingsSheet } from '@/components/settings-sheet';
import { StageView } from '@/components/stage-view';
import { Toast } from '@/components/toast';
import { Sheet } from '@/components/ui/sheet';
import { useMusicStore } from '@/features/music/store/useMusicStore';
import { useProjectStore } from '@/features/project/store/useProjectStore';
import { sortScenes } from '@/features/scene/lib/sceneTiming';
import { useUIStore } from '@/features/canvas/store/useUIStore';
import { useSettingsStore } from '@/features/settings/store/useSettingsStore';
import { useLocaleStore, useT } from '@/features/i18n/store/useLocaleStore';

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

/** どのシートが開いているか。一度に1つしか開かない */
type OpenSheet = 'dancers' | 'formations' | 'music' | 'scene' | 'settings' | null;

/**
 * ステージの横にパネルを常設する境目。**Web版と同じ 768px。**
 * タブレット・スマートフォンの横向き・ブラウザの窓がこれを超える。
 */
const WIDE_SCREEN = 768;

/**
 * エディタの画面。
 *
 * ■ 縦積みをやめて、画面の高さに収めた
 * これまでは全部を1本のスクロールに積んでいた。**ステージを見ると
 * シーンの帯が画面の外にあり、帯を見るとステージが外にある**という状態で、
 * このアプリの主目的である「時間軸と空間を同時に見る」ができていなかった
 * （Web版 EditorLayout が同じ理由で組み直されている）。
 *
 *   ヘッダー          高さ固定
 *   ステージ          flex-1（余った高さを全部もらう）
 *   再生 / 元に戻す
 *   シーンの帯        高さ固定、下端に貼り付く
 *
 * `min-h-0` が随所に入っているのは、flex の子が既定で
 * 「中身より小さくならない」ため。これが無いとステージが帯を画面外へ押し出す。
 *
 * ■ パネルはシートで開く
 * ダンサー・隊形・曲・シーンを直す の4つ。どれも「開いて決めたら閉じる」
 * 類のもので、ステージを触っている最中は場所を取らない方がよい。
 * 中身の部品（DancerSheet など）は**1行も変えずに**シートの中へ入れている。
 *
 * ■ 仮データで始まる
 * ログインして作品を開くと本物に入れ替わる（設定 → アカウント）。
 */
export default function EditorScreen() {
  const t = useT();

  // ステージの広さ。仮のサンプルで始まり、本物の作品を開いたら
  // その作品の広さに入れ替わる（作品ごとに違う）
  const [stage, setStage] = useState({
    width: SAMPLE.stageWidth,
    height: SAMPLE.stageHeight,
  });

  const [openSheet, setOpenSheet] = useState<OpenSheet>(null);
  const close = () => setOpenSheet(null);

  /**
   * 始め方を選ぶ画面を出しているか。
   *
   * ログイン済みなら出さない（自分の作品を開きに来た人に、始め方を
   * 聞き直す意味が無い）。**セッションを読み終えるまでは何も決めない** —
   * 先に「未ログイン」と決め打つと、ログイン済みの人にも一瞬この画面が
   * 出て消える。
   */
  const isSessionLoaded = useSessionStore((state) => state.isLoaded);
  const signedInUserId = useSessionStore((state) => state.userId);
  const [hasChosenStart, setHasChosenStart] = useState(false);
  const isWelcoming = isSessionLoaded && !signedInUserId && !hasChosenStart;

  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_SCREEN;

  // 曲があるかどうかで、下端に出すものが変わる
  const hasMusic = useMusicStore((state) => state.uri !== null);

  // 端末に覚えてあるものを読む（どれも Promise。Web版は同期だった）
  const loadSettings = useSettingsStore((state) => state.load);
  const loadView = useUIStore((state) => state.loadViewPreference);
  const loadLocale = useLocaleStore((state) => state.load);

  useEffect(() => {
    void loadSettings();
    void loadView();
    void loadLocale();
  }, [loadSettings, loadView, loadLocale]);

  /**
   * ログインしているかを【起動時に】読む。
   *
   * 以前は設定 → アカウントの `AccountPanel` が開いたときにだけ読んでいた。
   * それでも困らなかったのは、読めているかを見ているのがその画面だけ
   * だったため。**始め方を選ぶ画面が「ログイン済みなら出さない」を
   * 判断する**ようになったので、開く前に分かっていないといけない。
   * （`start()` は購読も張るので、後始末をそのまま返している）
   */
  const startSession = useSessionStore((state) => state.start);
  useEffect(() => startSession(), [startSession]);

  // 仮の隊形をストアへ入れる（Web版と同じ hydrate を通す）
  const hydrate = useProjectStore((state) => state.hydrate);
  useEffect(() => {
    // 始め方を選ぶ画面を出している間は入れない。**先に入れてしまうと
    // 「ゲストで始める」を押す前から下書きが動き出す**（案内を見るかどうかの
    // 選択も、その時点ではまだ受け取れていない）
    if (isWelcoming) return;

    let alive = true;
    void (async () => {
      /* 端末に残っている下書きがあれば、そちらを戻す。
         **無いときだけ**サンプルから始める（始め方の画面が
         「作ったものはこの端末にだけ残ります」と約束しているので、
         毎回サンプルへ戻していては話が違う） */
      const saved = await loadGuestDraft();
      if (!alive) return;
      if (saved) {
        hydrate({ ...saved, isGuest: true });
        const first = sortScenes(saved.scenes)[0];
        useUIStore.getState().selectScene(first?.id ?? null);
        void useMusicStore.getState().restore('local');
        return;
      }
      startFromSample();
    })();
    return () => {
      alive = false;
    };
  }, [hydrate, isWelcoming]);

  /** 触ったぶんを、手が止まってから端末へ書き戻す */
  useGuestDraftAutosave();

  /** サンプルの隊形で始める（残してある下書きが無いとき） */
  function startFromSample() {
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
    // 下書きに覚えさせた曲があれば戻す（作品を開けば入れ替わる）
    void useMusicStore.getState().restore('local');
  }

  if (isWelcoming) {
    return (
      <WelcomeScreen
        onGuestStart={() => setHasChosenStart(true)}
        // ログインの入力欄は設定 → アカウントにある。同じものを2つ作らない
        onOpenAccount={() => {
          setHasChosenStart(true);
          setOpenSheet('settings');
        }}
      />
    );
  }

  return (
    /* キーボードが出たら画面ごと持ち上げる。**下端の帯に入力欄がある**
       （選んでいる人の名前・シーン名）ので、そのままだとキーボードの下に
       隠れて、打っている字が見えない。iOS だけ指定する — Android は
       OS 側が既に縮めてくれるので、重ねると二重に上がる */
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1"
    >
    <SafeAreaView className="flex-1 bg-page">
      <EditorHeader
        onOpenDancers={() => setOpenSheet('dancers')}
        onOpenFormations={() => setOpenSheet('formations')}
        onOpenMusic={() => setOpenSheet('music')}
        onOpenSettings={() => setOpenSheet('settings')}
      />

      {/* 広い画面ではステージの横にパネルを常設する。狭い画面では
          その場所ぶんステージが小さくなるだけなので出さない */}
      <View className="min-h-0 flex-1 flex-row gap-3 px-3">
        <View className="min-h-0 min-w-0 flex-1">
          <StageView stageWidthUnits={stage.width} stageHeightUnits={stage.height} />
        </View>

        {isWide ? (
          <EditorSidePanel
            stageWidthUnits={stage.width}
            stageHeightUnits={stage.height}
            onEditScene={() => setOpenSheet('scene')}
          />
        ) : null}
      </View>

      {/* 下端。帯はここに貼り付き、ステージがどれだけ縮んでも動かない。
          インスペクターはこの上辺に浮かせるので、位置の基準として
          `relative` が要る */}
      <View className="relative shrink-0 gap-2 px-3 pt-2">
        {/* 選んでいる人の操作。高さを取らないので、選んでも画面が揺れない */}
        <DancerInspector />

        {/* 保存に失敗したときの知らせ。押せるもののすぐ上に出す */}
        <Toast />
        <PlaybackControls />
        <HistoryControls />

        {/* 曲を入れているときは、等間隔の帯ではなく**時間軸**を出す。
            「ここは詰まっている」「ここは間が空いている」が目で分かる方が、
            曲に合わせて組むときには要る。曲が無ければ従来の帯のまま
            （秒の位置に並べても、拠りどころが無くて読めない）。

            広い画面では横のパネルが同じ役をしているので、どちらも出さない */}
        {isWide ? null : hasMusic ? (
          <MusicTimeline
            stageWidthUnits={stage.width}
            stageHeightUnits={stage.height}
          />
        ) : (
          <SceneDock
            onEditScene={() => setOpenSheet('scene')}
            stageWidthUnits={stage.width}
            stageHeightUnits={stage.height}
          />
        )}
      </View>

      {/* どれも中身の高さぶんだけ下に貼り付く（`isTall` を付けない）。
          ダンサーも隊形も横に流す一覧なので縦には伸びず、高さを決め打ちに
          すると空いた面ばかりが目に入る。伸びるのは設定だけ */}
      {/* 初回だけ自動で出る使い方の案内。**一番最後に置く** — 幕を
          いちばん上に重ねたいので、他のシートより後に描かせる */}
      {/* キーボードのある面だけで効く（スマホでは何もしない） */}
      <EditorShortcuts />

      <EditorTour />

      <Sheet isOpen={openSheet === 'dancers'} onClose={close} title={t.editor.dancers}>
        <DancerSheet stageWidthUnits={stage.width} stageHeightUnits={stage.height} />
      </Sheet>

      <Sheet isOpen={openSheet === 'formations'} onClose={close} title={t.editor.formations}>
        <FormationSheet stageWidthUnits={stage.width} stageHeightUnits={stage.height} />
      </Sheet>

      <Sheet isOpen={openSheet === 'music'} onClose={close} title={t.editor.music}>
        <MusicPicker />
        {/* 曲を選ぶのと、その曲に合わせるのは続きの作業。速さ・拍子・
            頭出しはここに置く（設定の「既定の速さ」は別物） */}
        <SongSettings />
      </Sheet>

      <Sheet isOpen={openSheet === 'scene'} onClose={close} title={t.editor.editScene}>
        <SceneEditor />
      </Sheet>

      <SettingsSheet
        isOpen={openSheet === 'settings'}
        onClose={close}
        onProjectLoaded={setStage}
      />

      {/* 取り消せない操作の確認。**シートより後ろに置く** — シートの中から
          「消す」を押したときに、確認の板がその上に出る必要がある */}
      <ConfirmDialog />
    </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
