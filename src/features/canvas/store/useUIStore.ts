import { create } from "zustand";
import {
  DEFAULT_VIEW_PREFERENCE,
  parseViewPreference,
  projectViewKey,
  VIEW_STORAGE_KEY,
  type GridMode,
  type ViewPreference,
} from "@/features/canvas/lib/viewPreference";

type Toast = {
  message: string;
  /** 面の色は変えず、アイコンの中だけが色を持つ(Toast.tsx)。
   * 注意(warning)は「できたが、気に留めてほしい」場合に使う */
  type: "success" | "warning" | "error";
  /** 右端に出す1つだけの操作。失敗なら「再試行」、取り消せる操作なら
   * 「元に戻す」。知らせて終わりにせず、その場で次の一手を出す */
  action?: { label: string; onAction: () => void };
};

/** ドラッグ中、格子スナップが効いている格子線の位置(ステージ座標系の整数)。
 * 効いていない軸はnull。両方non-nullなら交差点にスナップしていることを表す */
type DragSnapLine = {
  x: number | null;
  y: number | null;
};

/** 取り消せない操作の前に出す確認ダイアログの中身。
 * window.confirm()の置き換えで、ブラウザ標準では書けなかった
 * 「一緒に何が消えるのか」を具体的に示せるようにしている */
export type ConfirmRequest = {
  title: string;
  description?: string;
  /** 巻き添えで消えるものを数で示すチップ(「12 シーン」「48 配置」など) */
  meta?: string[];
  /** 実行ボタンの文言。省略時は「削除する」 */
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
};

/** ステージの目盛りの出し方。円形の隊形は格子より同心円の方が読みやすい。
 * 定義は端末に保存する側(viewPreference)に置いてある */
export type { GridMode };

type UIState = {
  selectedSceneId: string | null;
  /** 直前に選択していたシーン。「どこから来たか」が分かると、隣のシーンへの
   * 移動が「進んだ」のか「戻った」のかを判定できる。曲線の制御点と遷移時間は
   * 区間(前のシーン↔次のシーン)ごとに1つで、後ろ側のシーンのpositionに
   * 保存されているため、戻るときはそちらを見に行く必要がある
   * (DancerLayerが読み取る) */
  previousSceneId: string | null;
  /**
   * 選んでいるダンサー。**選んだ順**に並ぶ（空なら未選択）。
   *
   * 1人だけだったものを並びにしたのは、「前列4人をまとめて1マス下げる」を
   * 1人ずつ4回やることになっていたため（2026-08-18、PC 特化の方針）。
   * 修飾キーを押しながら選ぶので、**マウスのある画面でだけ増える** —
   * スマホでは今まで通り1人のまま。
   *
   * インスペクター・回転・曲線のように「1人ぶん」を見る側は
   * `selectPrimaryDancerId`（＝末尾＝最後に選んだ人）を読む。
   */
  selectedDancerIds: string[];
  /** ステージに敷く目盛り。格子(1マス=約90cm)と同心円(中心からの距離と角度)は
   * 同じ「どこに立っているか」を別の読み方で示すもので、重ねると
   * どちらも読めなくなるため、並立ではなく1つを選ぶ */
  gridMode: GridMode;
  toast: Toast | null;
  /** 「マイ・フォーカス」で強調表示中のダンサー。シーンをまたいでも
   * 保持したいUI状態なので、シーン選択と同じくここに置く */
  focusedDancerId: string | null;
  /** オンの間、選択中シーン→次のシーンへの移動導線をステージ上に描画する */
  isPathVisible: boolean;
  /** バミリ(全シーンの立ち位置を床に重ねた印)を出すか */
  isStageMarksVisible: boolean;
  /** 客席から見えなくなる人(顔被り)を警告するか。移動中も含めて調べる */
  isBlindSpotCheckVisible: boolean;
  /** ステージを払ってシーンを送る操作を受け付けるか */
  isSwipeSceneChangeEnabled: boolean;
  /** 下端の時間軸を出すか。畳むとステージがそのぶん広くなる */
  isTimelineVisible: boolean;
  /** シーン移動のアニメーションが進行中か。この間はダンサーを掴ませない
   * (掴むと、移動アニメーションとドラッグが同じ座標を取り合う) */
  isTransitioning: boolean;
  /** ドラッグ中の格子スナップ状態(CanvasBoardのonDragMoveが更新し、Stageが
   * 該当する格子線をハイライト表示するために読む) */
  dragSnapLine: DragSnapLine;
  /** シーンのタイムライン再生中かどうか(SceneTimelineの再生シーケンサーが
   * 読み書きする)。手動でシーンを選ぶと止まる */
  isPlaying: boolean;
  /** 再生の入り切りを頼まれた時刻。まだなら null。
   * isPlaying を直に書かずここを経由するのは、押してから動き出すまでに
   * 予備拍(カウントイン)を挟む場合があり、その判断をドック側1箇所に
   * まとめておきたいため(requestTour と同じ「合図だけ渡す」形) */
  playToggleRequestedAt: number | null;
  /** 前回どのシーンから再生を始めたか。最後まで流し終えた状態でもう一度
   * 押されたときの戻り先になる(playbackStart.ts)。保存はしない —
   * 開き直したときに、身に覚えのない場所から鳴り出す方が困る */
  playbackStartSceneId: string | null;
  /**
   * たったいま足した/複製したシーン。少ししたら消える。
   *
   * 曲が無いときの追加は**選んでいるシーンの隣**へ入るので、末尾へ
   * 積まれるのを見慣れた目には「増えたのが見えない」。増えた場所を
   * 一拍光らせて、そこへ寄せるために要る(SceneRow が読む)。
   */
  justAddedSceneId: string | null;
  /** シーン一覧シート(並び替え・複製・削除)を開いているか */
  isSceneSheetOpen: boolean;
  /** 使い方の案内を頼まれた時刻。まだなら null */
  tourRequestedAt: number | null;
  /**
   * ゲストで始めるときに選んだ、案内を見るかどうか。
   *
   * 選択画面(WelcomeScreen)が書き、エディタの EditorTour が読む。
   * プロップで EditorLayout を貫通させると、**ログイン済みでも使う
   * 共通の器に、ゲスト専用の引数が生える**ので、ここを経由させている。
   * null は「選んでいない」= 従来どおり初回だけ自動で出す。
   */
  guestTourIntent: "show" | "skip" | null;
  /** ダンサー追加シートを開いているか */
  isAddDancerSheetOpen: boolean;
  /** フォーメーションのテンプレートシートを開いているか */
  isTemplateSheetOpen: boolean;
  /** 動画の書き出しシートを開いているか */
  isExportSheetOpen: boolean;
  /**
   * 曲のシートを開いているか。
   *
   * 以前はヘッダー(EditorHeader)の中の state だけで持っていたので、
   * 「表示とモード」のメニューからしか開けなかった。**曲は時間軸の
   * 主役なのに入口が畳んだメニューの中**で、見つけにくいという指摘を
   * もらったので、下端のドックからも開けるようここへ上げた。
   */
  isMusicSheetOpen: boolean;
  /** 表示中の確認ダイアログ。nullなら出ていない */
  confirm: ConfirmRequest | null;
  /** 登録/ログインのモーダル。nullなら出ていない。
   * 画面遷移ではなくモーダルにしているのは、作りかけの作品を見たまま
   * 登録できるようにするため(「これを残したい」という気持ちが切れない) */
  authDialogMode: "login" | "signup" | null;

  selectScene: (sceneId: string | null) => void;
  /** その人だけを選ぶ。null で解除 */
  selectDancer: (dancerId: string | null) => void;
  /** 選びに足す/外す（修飾キーを押しながらのクリック） */
  toggleDancer: (dancerId: string) => void;
  setGridMode: (mode: GridMode) => void;
  showToast: (toast: Toast) => void;
  clearToast: () => void;
  setFocusedDancer: (dancerId: string | null) => void;
  togglePathVisible: () => void;
  toggleStageMarks: () => void;
  toggleBlindSpotCheck: () => void;
  toggleSwipeSceneChange: () => void;
  toggleTimelineVisible: () => void;
  setIsTransitioning: (isTransitioning: boolean) => void;
  setDragSnapLine: (line: DragSnapLine) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  /** 再生ボタンを押したのと同じことを頼む(カウントインを含む) */
  requestTogglePlay: () => void;
  setPlaybackStartScene: (sceneId: string | null) => void;
  /** 足したことを知らせる。同じシーンをもう一度渡せば光り直す */
  markSceneAdded: (sceneId: string | null) => void;
  setSceneSheetOpen: (isOpen: boolean) => void;
  /** 使い方の案内を出し直す。押した時刻を入れるだけの合図で、
   * 同じ操作を繰り返しても値が変わるので毎回反応する */
  requestTour: () => void;
  setGuestTourIntent: (intent: "show" | "skip" | null) => void;
  setAddDancerSheetOpen: (isOpen: boolean) => void;
  setTemplateSheetOpen: (isOpen: boolean) => void;
  setExportSheetOpen: (isOpen: boolean) => void;
  setMusicSheetOpen: (isOpen: boolean) => void;
  /** 確認ダイアログを出す。実行された場合の処理はrequest.onConfirmに持たせる */
  requestConfirm: (request: ConfirmRequest) => void;
  closeConfirm: () => void;
  openAuthDialog: (mode: "login" | "signup") => void;
  closeAuthDialog: () => void;
  /**
   * いま開いている作品。null ならホーム。
   *
   * ここが入っている間、「表示とモード」の切り替えは**その作品だけ**に
   * 効く。設定(useSettingsStore の scope)と同じ決まり。
   */
  viewScopeProjectId: string | null;
  /** 端末に覚えてある「表示とモード」の選択を読み込む。画面が出てから
   * 1回だけ呼ぶ(サーバー側にlocalStorageは無いので、描画前には読めない)。
   * 作品を渡すと、土台の上にその作品の選択を重ねて読む */
  loadViewPreference: (projectId?: string | null) => void;
};

/**
 * 「表示とモード」の選択を端末へ書き戻す。
 *
 * 作品を開いていれば**その作品のキー**へ、ホームなら土台へ。
 * 設定(useSettingsStore)と同じ決まりで、
 * 「ホームで変えたら全部の作品へ、作品を開いて変えたらその作品だけ」。
 */
function persistViewPreference(
  preference: ViewPreference,
  projectId: string | null,
) {
  try {
    localStorage.setItem(
      projectId ? projectViewKey(projectId) : VIEW_STORAGE_KEY,
      JSON.stringify(preference),
    );
  } catch {
    // プライベートモードや容量超過で書けないことがある。次回に残らない
    // だけなので、今の画面はそのまま動かす(見た目の設定と同じ扱い)
  }
}

/** いまの状態から保存する形を組み、変えた1項目だけを上書きして書き戻す。
 *
 * 以前は各setterが保存対象を1つずつ手で並べていた。覚える項目が増えるたびに
 * 全部のsetterへ足して回る必要があり、書き漏れたsetterを通ったときだけ
 * その項目が既定へ戻る、という気づきにくい壊れ方をする */
function persistFromState(
  state: UIState,
  changed: Partial<ViewPreference>,
): void {
  persistViewPreference(
    {
      gridMode: state.gridMode,
      isPathVisible: state.isPathVisible,
      isStageMarksVisible: state.isStageMarksVisible,
      isBlindSpotCheckVisible: state.isBlindSpotCheckVisible,
      isSwipeSceneChangeEnabled: state.isSwipeSceneChangeEnabled,
      isTimelineVisible: state.isTimelineVisible,
      ...changed,
    },
    state.viewScopeProjectId,
  );
}

/**
 * 主に選んでいる1人（＝最後に選んだ人）。選んでいなければ null。
 *
 * インスペクター・回転ハンドル・曲線の編集は「1人ぶん」の操作なので、
 * 複数選んでいる間は出さない。読む側が毎回 `.at(-1)` を書かずに済むよう、
 * ここに1つだけ置く。
 */
export function selectPrimaryDancerId(state: UIState): string | null {
  return state.selectedDancerIds.length === 1
    ? state.selectedDancerIds[0]
    : null;
}

export const useUIStore = create<UIState>((set, get) => ({
  selectedSceneId: null,
  previousSceneId: null,
  selectedDancerIds: [],
  // 3つの既定値は viewPreference が持つ。サーバーで描くHTMLと最初の
  // ブラウザ描画を一致させるため、ここでは必ず既定から始め、
  // 読み込みは loadViewPreference に任せる
  gridMode: DEFAULT_VIEW_PREFERENCE.gridMode,
  toast: null,
  focusedDancerId: null,
  isPathVisible: DEFAULT_VIEW_PREFERENCE.isPathVisible,
  isStageMarksVisible: DEFAULT_VIEW_PREFERENCE.isStageMarksVisible,
  isBlindSpotCheckVisible: DEFAULT_VIEW_PREFERENCE.isBlindSpotCheckVisible,
  isSwipeSceneChangeEnabled: DEFAULT_VIEW_PREFERENCE.isSwipeSceneChangeEnabled,
  isTimelineVisible: DEFAULT_VIEW_PREFERENCE.isTimelineVisible,
  viewScopeProjectId: null,
  isTransitioning: false,
  dragSnapLine: { x: null, y: null },
  isPlaying: false,
  playToggleRequestedAt: null,
  playbackStartSceneId: null,
  justAddedSceneId: null,
  isSceneSheetOpen: false,
  tourRequestedAt: null,
  guestTourIntent: null,
  isAddDancerSheetOpen: false,
  isTemplateSheetOpen: false,
  isExportSheetOpen: false,
  isMusicSheetOpen: false,
  confirm: null,
  authDialogMode: null,

  // 同じシーンを選び直したときにpreviousSceneIdを上書きしない。上書きすると
  // 「前のシーン＝今のシーン」になって移動方向が判定できなくなるため
  selectScene: (sceneId) =>
    set((state) =>
      state.selectedSceneId === sceneId
        ? {}
        : { selectedSceneId: sceneId, previousSceneId: state.selectedSceneId },
    ),
  selectDancer: (dancerId) =>
    set({ selectedDancerIds: dancerId === null ? [] : [dancerId] }),

  /* 足すときは**末尾へ**。末尾＝主に選んでいる1人なので、最後に触った人が
     インスペクターに出る。外したときも並びは崩さない（まとめて動かすときの
     順番が変わると、履歴の畳み込み(hasSameTargets)が効かなくなる） */
  toggleDancer: (dancerId) =>
    set((state) => ({
      selectedDancerIds: state.selectedDancerIds.includes(dancerId)
        ? state.selectedDancerIds.filter((id) => id !== dancerId)
        : [...state.selectedDancerIds, dancerId],
    })),
  setGridMode: (mode) =>
    set((state) => {
      persistFromState(state, { gridMode: mode });
      return { gridMode: mode };
    }),
  showToast: (toast) => set({ toast }),
  clearToast: () => set({ toast: null }),
  setFocusedDancer: (dancerId) => set({ focusedDancerId: dancerId }),
  toggleBlindSpotCheck: () =>
    set((state) => {
      const isBlindSpotCheckVisible = !state.isBlindSpotCheckVisible;
      persistFromState(state, { isBlindSpotCheckVisible });
      return { isBlindSpotCheckVisible };
    }),
  toggleStageMarks: () =>
    set((state) => {
      const isStageMarksVisible = !state.isStageMarksVisible;
      persistFromState(state, { isStageMarksVisible });
      return { isStageMarksVisible };
    }),
  setIsTransitioning: (isTransitioning) =>
    set((state) =>
      state.isTransitioning === isTransitioning ? {} : { isTransitioning },
    ),
  toggleSwipeSceneChange: () =>
    set((state) => {
      const isSwipeSceneChangeEnabled = !state.isSwipeSceneChangeEnabled;
      persistFromState(state, { isSwipeSceneChangeEnabled });
      return { isSwipeSceneChangeEnabled };
    }),
  toggleTimelineVisible: () =>
    set((state) => {
      const isTimelineVisible = !state.isTimelineVisible;
      persistFromState(state, { isTimelineVisible });
      return { isTimelineVisible };
    }),
  togglePathVisible: () =>
    set((state) => {
      const isPathVisible = !state.isPathVisible;
      persistFromState(state, { isPathVisible });
      return { isPathVisible };
    }),
  loadViewPreference: (projectId) => {
    // 引数を省いたときは**いまの範囲を保つ**。読み込みは2箇所から呼ばれ
    // (アプリ全体の SettingsLoader と、作品を開いた EditorLayout)、
    // React は子の効果を先に走らせる。省略を「ホーム」と解すると、
    // あとから走る親側の呼び出しが作品の範囲を毎回消してしまう
    const scope = projectId === undefined ? get().viewScopeProjectId : projectId;
    let preference = DEFAULT_VIEW_PREFERENCE;
    try {
      // 土台をまず読み、作品を開いていればその上に重ねる。
      // 重ねる形にしているのは、**まだ触っていない項目は土台に従わせる**
      // ため(作品ごとに全項目を丸ごと持つと、ホームで変えた設定が
      // 一度でも開いた作品には二度と届かなくなる)
      preference = parseViewPreference(localStorage.getItem(VIEW_STORAGE_KEY));
      if (scope) {
        const scoped = localStorage.getItem(projectViewKey(scope));
        if (scoped) {
          preference = parseViewPreference(
            JSON.stringify({
              ...preference,
              ...(JSON.parse(scoped) as Record<string, unknown>),
            }),
          );
        }
      }
    } catch {
      // localStorage自体が触れない環境。既定のまま動かす
    }
    set({ ...preference, viewScopeProjectId: scope });
  },
  // 中身が前回と同じなら何も書き換えない(空オブジェクトを返す=状態は不変)。
  // これはドラッグ中に毎pointermoveごとに呼ばれるため、素直に
  // set({ dragSnapLine: line })にすると、スナップしていない間も毎回
  // 新しい{x: null, y: null}オブジェクトが入り、参照が変わるせいで
  // これを購読しているStageが指を動かすたびに再レンダーされてしまう
  setDragSnapLine: (line) =>
    set((state) =>
      state.dragSnapLine.x === line.x && state.dragSnapLine.y === line.y
        ? {}
        : { dragSnapLine: line },
    ),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  requestTogglePlay: () => set({ playToggleRequestedAt: Date.now() }),
  setPlaybackStartScene: (sceneId) => set({ playbackStartSceneId: sceneId }),
  markSceneAdded: (sceneId) => set({ justAddedSceneId: sceneId }),
  setSceneSheetOpen: (isOpen) => set({ isSceneSheetOpen: isOpen }),

  requestTour: () => set({ tourRequestedAt: Date.now() }),
  setGuestTourIntent: (intent) => set({ guestTourIntent: intent }),
  setAddDancerSheetOpen: (isOpen) => set({ isAddDancerSheetOpen: isOpen }),
  setTemplateSheetOpen: (isOpen) => set({ isTemplateSheetOpen: isOpen }),
  setExportSheetOpen: (isOpen) => set({ isExportSheetOpen: isOpen }),
  setMusicSheetOpen: (isOpen) => set({ isMusicSheetOpen: isOpen }),
  requestConfirm: (request) => set({ confirm: request }),
  closeConfirm: () => set({ confirm: null }),
  openAuthDialog: (mode) => set({ authDialogMode: mode }),
  closeAuthDialog: () => set({ authDialogMode: null }),
}));
