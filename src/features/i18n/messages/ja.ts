/**
 * 画面に出す言葉。**日本語がこの辞書の正**。
 *
 * ここに書いた形がそのまま型になり(`type Messages = typeof ja`)、
 * 英語と韓国語はそれを満たすことを型で強制される。
 * **訳し忘れ・綴り間違いは `npm run verify` の tsc で落ちる**ので、
 * 実行時にキーがそのまま画面へ出ることが起こらない。
 *
 * 引くときはキーの文字列ではなくプロパティを辿る
 * (`t.settings.stage.audienceOnTop.label`)。補完が効き、
 * i18n のライブラリを足さずに済む。
 *
 * 数や名前が混ざる文は関数で持つ。文の途中で切って連結すると、
 * 語順の違う言語で組み立て直せなくなる。
 */
export const ja = {
  language: {
    label: "言語",
    description: "この端末で覚えます",
  },

  /**
   * 隊形の呼び名。
   *
   * 59個の名前を並べる代わりに、形と人数の内訳に分けてある
   * (formationTemplates.ts の FormationLabel)。「V字」と「2列」が
   * どの人数でも同じ言葉で出るので、言語をまたいでも関係が崩れない。
   *
   * 奥から手前への順。「後1-2-2前」なら奥から1人・2人・2人。
   */
  formations: {
    row: "横1列",
    rowPair: "横並び",
    rowFront: "前寄せ横並び",
    rowBack: "奥寄せ横並び",
    column: "縦1列",
    columnPair: "縦1列（前後）",
    diagonal: "斜め",
    diagonalLine: "斜め列",
    lShape: "L字",
    xShape: "X字",
    wShape: "W字（ジグザグ）",
    diamond: "ダイヤ",
    circle: "円（サークル）",
    circleCenter: "円＋センター",
    arc: "弧（アーチ）",
    wedgeIn: "ハの字（後狭・前広）",
    wedgeOut: "くさび（後広・前狭）",
    triangle: (rows: number[]) => `三角（後${rows[0]}・前${rows[1]}）`,
    triangleDown: (rows: number[]) => `逆三角（後${rows[0]}・前${rows[1]}）`,
    v: (rows: number[]) => `V字（後${rows.join("-")}前）`,
    vDown: (rows: number[]) => `逆V字（後${rows.join("-")}前）`,
    twoRows: (rows: number[]) => `2列（${rows.join("-")}）`,
    twoColumns: (rows: number[]) => `縦2列（${rows.join("-")}）`,
    stagger: (rows: number[]) => `千鳥（${rows.join("-")}）`,
    arcRows: (rows: number[]) => `弧2列（${rows.join("-")}）`,
    grid: (rows: number[]) => `${rows[0]}×${rows[1]} グリッド`,
  },

  templateSheet: {
    shapeCount: (n: number) => `${n}種`,
    needsTwoNotice:
      "フォーメーションを選ぶには2人以上が必要です。ヘッダーの人物アイコンからダンサーを追加してください。",
    castCount: (n: number) => `${n}人`,
    current: "いま",
    matchingCast: (n: number) => `いまステージにいる${n}人に合わせて表示しています`,
    forCast: (n: number) => `${n}人ぶんの形です。`,
    leftOver: (n: number) => `余る${n}人はいまの位置のまま残ります（消えません）。`,
    emptySpots: (n: number) => `${n}点は空きになります（前列から埋めます）。`,
    title: "フォーメーション",
    needsTwo: "2人以上",
    spacing: { narrow: "狭い", normal: "標準", wide: "広い" },
    flipX: "左右反転",
    flipY: "前後反転",
    rotate: "90°回転",
    apply: "この形に置き換える",
    applyNamed: (name: string) => `${name}に置き換える`,
    applied: (name: string) => `${name}に置き換えました`,
    appliedPartial: (name: string, leftOut: number) =>
      `${name}に置き換えました（${leftOut}人はそのまま）`,
    undo: "元に戻す",
    failed: "フォーメーションの適用に失敗しました",
  },

  themeSheet: {
    backToList: "一覧へ戻る",
    textureTitle: "背景の質感",
    textureNote: "地の上に薄く重ねる装飾です。ステージの中には掛かりません。",
    themeCount: (n: number) => `${n}種`,
    previewMode: "モード",
    title: "見た目",
    all: "すべて",
    dark: "暗い系",
    material: "紙・素材系",
    selected: "選択中",
    deviceOnly: "この端末だけに保存",
    apply: "この見た目にする",
  },

  themes: {
    midnight: "ミッドナイト・ピンク",
    neon: "ネオン・シアン",
    amber: "アンバー・ステージ",
    mono: "モノクローム",
    chalk: "チョークボード",
    paper: "クリーム・ペーパー",
    gridnote: "グラフ・ノート",
    kraft: "クラフト・プレス",
    tracing: "トレーシング・シート",
    whiteboard: "マーカー・ボード",
  },

  themeSubtitles: {
    midnight: "既定",
    neon: "発光・ガラス",
    amber: "舞台照明・板張り",
    mono: "UIは無彩色だけ",
    chalk: "暗いまま素材を変える",
    paper: "クリーム紙・赤鉛筆",
    gridnote: "万年筆・赤ペン",
    kraft: "厚紙・沈んだ文字",
    tracing: "次のシーンが透ける",
    whiteboard: "太いマーカー・強い色",
  },

  textures: {
    flat: "フラット",
    nebula: "ネビュラ",
    horizon: "ホリゾント幕",
    spot: "スポットの円光",
    grid: "方眼と目盛り",
    grain: "グレイン",
    curtain: "暗幕",
  },

  editor: {
    backToProjects: "プロジェクト一覧に戻る",
    addDancer: "ダンサーを追加",
    projectName: "プロジェクト名",
    projectNameFailed: "プロジェクト名の変更に失敗しました",
    upstage: "バックステージ",
    downstage: "客席側",
    noScenes: "シーンがありません",
    noScenesYet: "まだシーンがありません",
    createFirstScene: "最初のシーンを作る",
    copyCurrent: "いまの配置をコピーして追加",

    view: {
      title: "表示とモード",
      counts: (dancers: number, scenes: number) =>
        `${dancers}人 · ${scenes}シーン`,
      gridLabel: "目盛り",
      gridSquare: "格子",
      gridCircle: "同心円",
      gridNone: "なし",
      path: {
        label: "導線を表示",
        description: "次のシーンへの動きを線で描く",
      },
      blindSpot: {
        label: "顔被りチェック",
        description: "手前の人の真後ろに入っている人に印を出す",
      },
      stageMarks: {
        label: "バミリ",
        description: "全シーンの立ち位置を床に重ねて出す",
      },
      swipe: {
        label: "払ってシーンを送る",
        description: "ステージを横にドラッグして前後のシーンへ",
      },
      thisProject: "この作品",
      music: "曲",
      share: "共有",
      review: "隊形を見てもらう",
      exportVideo: "動画にする",
      tour: "チュートリアルを開始する",
      settings: "設定",
      override: {
        label: "このプロジェクトだけ別の見た目",
        on: "ホームでテーマを変えても、ここは変わりません",
        off: "オンにすると、いまの見た目をこのプロジェクトに固定します",
      },
    },

    dock: {
      openScenes: "シーン一覧を開く",
      cancelCountIn: "カウントインを取り消す",
      pause: "再生を停止",
      play: "最後のシーンまで再生",
      sceneSettings: (name: string) => `「${name}」の設定を開く`,
      moveSeconds: (seconds: number) => ` · ${seconds}秒で移動`,
      addScene: "シーンを追加",
    },

    scenes: {
      timeInSong: "曲のこの位置",
      ripple: "以降のシーンも一緒にずらす",
      rippleNote:
        "切っていると、動くのはこのシーンだけです（隣を追い越すと順番も入れ替わります）",
      seconds: "秒",
      title: "シーン",
      dancers: "ダンサー",
      sceneName: "シーン名",
      summary: (count: number, seconds: number) =>
        `${count}件 · 合計 ${seconds}s`,
      moveIn: (seconds: number) => ` · ${seconds}s で移動`,
      showing: " · 表示中",
      duplicate: "複製",
      delete: "削除",
    },

    save: {
      save: "保存",
      saved: "保存済み",
      failed: "保存に失敗しました",
      retry: "再試行",
      unsaved: "未保存の変更があります",
    },

    history: {
      undo: "元に戻す",
      undoHint: "元に戻す (Ctrl+Z)",
      redo: "やり直す",
      redoHint: "やり直す (Ctrl+Shift+Z)",
    },

    template: {
      open: "フォーメーションから選ぶ",
      openSame: "フォーメーションから選ぶ(前のシーンと同じ配置のままです)",
    },

    /** 画面には出ず、読み上げにだけ流れる案内 */
    a11y: {
      dragHelp:
        "ダンサーをドラッグして移動できます。選択した状態で矢印キーを押しても移動できます(Shiftキーを押しながらだとより大きく移動します)。",
      dragStart: "ダンサーの移動を開始しました。",
      dragEnd: "ダンサーの位置を確定しました。",
      dragCancel: "ダンサーの移動をキャンセルしました。",
    },

    errors: {
      position: "位置の保存に失敗しました",
      rotation: "向きの保存に失敗しました",
      curve: "曲線の変更に失敗しました",
      retry: "再試行",
    },
  },

  common: {
    close: "閉じる",
    back: "戻る",
    loading: "読み込み中",
    rename: (label: string) => `${label}を変更`,
    saveToCloud: "保存",
    settings: "設定",
    appearance: "見た目を変える",
    undoFailed: "元に戻す操作に失敗しました",
    redoFailed: "やり直す操作に失敗しました",
    undoTargetGone: "対象が削除されているため元に戻せませんでした",
    travelFromPrevious: (seconds: string) =>
      `前のシーンから ${seconds}秒かけて移動`,
  },

  app: {
    description: "スマートフォンで作る、ダンスのフォーメーション",
    ogLocale: "ja_JP",
  },

  auth: {
    signIn: "ログイン",
    signUp: "新規登録",
    createAccount: "アカウントを作る",
    email: "メールアドレス",
    password: "パスワード",
    passwordSignUp: "パスワード(6文字以上)",
    signingIn: "ログイン中...",
    signingUp: "登録中...",
    submitSignUp: "登録する",
    haveAccount: "既にアカウントをお持ちの方は ",
    noAccount: "アカウントをお持ちでない方は ",
    wrongCredentials: "メールアドレスまたはパスワードが正しくありません。",
    alreadyRegistered: "このメールアドレスは既に登録されています。",
    signUpFailed: "登録に失敗しました。時間をおいて再度お試しください。",
    confirmSent: "確認メールを送信しました。",
    confirmOpen: "メール内のリンクを開くと登録が完了します。",
    backToSignIn: "ログイン画面に戻る",
    insecure:
      "この画面は暗号化されていない接続で開かれているため、ログインできません。",
    insecureWhy: (https: string, localhost: string) =>
      `ブラウザは ${https} と ${localhost} だけを安全とみなし、認証に必要な機能をそれ以外で無効にします。実機で試すときは`,
    insecureHow: "で開いてください。",
    draftHere: "いま作っている作品は、この端末の中にだけあります。",
    draftSaved: "登録すると、そのまま保存されます。",
    draftPending:
      "確認が済むまで作品は保存されません。このタブを閉じずに、メールのリンクを開いてから戻ってください。",
  },

  /** 未ログインで開いたときに最初に出る、始め方を選ぶ画面 */
  welcome: {
    tagline: "稽古場で配る隊形図を、曲に合わせて動く形に。",
    guestStart: "ゲストで始める",
    withTour: "使い方の案内から始める",
    guestNote: "登録は要りません。作ったものはこの端末にだけ残ります。",
    or: "または",
  },

  projects: {
    cardSummary: (scenes: number, dancers: number) =>
      `${scenes} シーン · ${dancers} 人`,
    count: (n: number) => `プロジェクト ${n}件`,
    empty: "まだプロジェクトがありません。",
    emptyHint: "上の入力から曲名を入れると、ステージが1つ立ち上がります。",
    newName: "新しいプロジェクト名",
    create: "プロジェクトを作成",
    createFailed: "プロジェクトの作成に失敗しました",
    renamedForClash: (title: string) =>
      `同じ名前があったので「${title}」で作りました`,
    tapToStart: "タップして最初のシーンを作る",
    noScenes: "シーン 0",
    remove: (title: string) => `${title}を削除`,
    deleteTitle: (title: string) => `「${title}」を削除しますか?`,
    deleteDescription:
      "このプロジェクトのシーン・ダンサー・配置がすべて消えます。削除は元に戻せません。",
    deleteMetaScenes: (n: number) => `${n} シーン`,
    deleteMetaDancers: (n: number) => `${n} 人`,
    deleteMetaPositions: (n: number) => `${n} 配置`,
    deleteFailed: "プロジェクトの削除に失敗しました",
    renameFailed: "名前の変更に失敗しました",
    guestTitle: "はじめてのフォーメーション",
    sceneName: (index: number) => `シーン${index}`,
  },

  confirm: {
    cannotUndo: "削除は元に戻せません。",
    cancel: "キャンセル",
    deleting: "削除中...",
    delete: "削除する",
  },

  tour: {
    stageTitle: "ここが舞台です",
    stageBody:
      "上がバックステージ、下が客席側。丸がダンサーで、掴んで動かせます。下の目盛りはセンターからの位置です。",
    timelineTitle: "横の位置が、曲の時間です",
    timelineBody:
      "コマは「曲の何秒目の隊形か」の位置に並びます。コマを横に引くとその時刻が動き、間隔がそのまま移動にかけられる時間になります。",
    addTitle: "隊形を足す",
    addBody:
      "いま聞いている位置に、いまの配置をコピーした隊形を作ります。作ってから動かす、が基本の流れです。",
    viewTitle: "見え方を変える",
    viewBody:
      "導線・格子・顔被りの警告などの切り替えと、見た目の変更はここです。この案内をもう一度見るのもここから。",
    back: "戻る",
    close: "閉じる",
    last: "はじめる",
    next: "次へ",
    nextWithProgress: "次へ（{current}/{total}）",
    skip: "skip",
  },

  offline: {
    title: "オフライン — Choreon",
    heading: "いま電波が届いていません",
    body: "一度開いた画面は、そのまま見られます。直前の画面へ戻るか、電波が戻ってから開き直してください。",
    toProjects: "作品の一覧へ",
  },

  data: {
    needsSignIn: "ログインしてから取り込んでください",
    imported: "取り込みました",
    importFailed: "取り込めませんでした",
    resetTitle: "この作品を空にしますか",
    resetDescription:
      "シーンとダンサーを全部消します。作品そのもの(名前・ステージの広さ・曲の頭出し)は残ります。取り消せません。",
    resetMetaScenes: (n: number) => `${n} シーン`,
    resetMetaDancers: (n: number) => `${n} 人`,
    resetConfirm: "空にする",
    resetFailed: "空にできませんでした",
    unreadableFile: "ファイルを読み取れませんでした",
    wrongShape: "ファイルの形が違います",
    wrongVersion: "この形式は読み込めません(別の版で書き出されたファイルです)",
    noProject: "作品の情報が入っていません",
    incomplete: "ダンサー・シーン・配置のどれかが足りません",
  },

  sceneActions: {
    renameFailed: "シーン名の変更に失敗しました",
    retimeFailed: "シーンの時刻の変更に失敗しました",
    deleteTitle: (name: string) => `「${name}」を削除しますか?`,
    deleteDescription:
      "このシーンの配置と、ここへ入る導線も一緒に消えます。削除は元に戻せません(移動や向きの変更は戻せます)。",
    deleteMeta: (dancers: number) => `${dancers} 人の配置`,
    deleteFailed: "シーンの削除に失敗しました",
    remove: (name: string) => `「${name}」を削除`,
  },

  dbErrors: {
    missingColumn:
      "DBのスキーマが古いようです。supabase/schema.sql をSupabaseのSQL Editorで実行してください",
    insufficientPrivilege:
      "権限がありません。テーブルのGRANT・RLSポリシーを確認してください",
  },

  viewer: {
    move: {
      still: "その場",
      to: (direction: string, steps: number) => `${direction}へ 約${steps}歩`,
      direction: (
        sideways: "left" | "right" | null,
        depth: "front" | "back" | null,
      ) =>
        `${sideways === null ? "" : sideways === "left" ? "下手" : "上手"}${
          depth === null ? "" : depth === "front" ? "前" : "奥"
        }`,
      turn: (facing: string) => `＋ ${facing}`,
    },
    facing: {
      0: "客席向き",
      45: "下手前向き",
      90: "下手向き",
      135: "下手奥向き",
      180: "奥向き",
      225: "上手奥向き",
      270: "上手向き",
      315: "上手前向き",
    },
    route: {
      title: (name: string) => `${name} の道順`,
      me: "自分",
      everyone: "全員",
      all: "ぜんぶ",
      summary: (scenes: number, total: string) =>
        `${scenes} シーン · 通し ${total}`,
      lastFormation: "ここが最後の隊形です",
      stepsNote: "歩数は 1歩 60cm・1マス 90cm で計算した目安です。",
      sidesNote: "上手／下手は客席から見た向きです。",
      fast: " — 速め",
      hereNow: " · いまここ",
      tooFast: "歩いて間に合わない速さです",
      reselect: "ポジションを選び直す",
      play: "通しで再生",
      stop: "止める",
      paths: "導線",
    },
    entry: {
      question: "あなたはどれですか",
      note: "選ぶと、その人だけが濃く出て、道順も出るようになります。あとで変えられます。",
      position: (name: string) => `${name} の立ち位置`,
      pick: "自分を選んでください",
      pickNamed: (name: string) => `「${name}」で見る`,
      skip: "選ばずに全員を見る",
    },
    music: {
      pickSame: "同じ曲をこの端末で選ぶ",
    },
  },

  share: {
    title: "共有",
    enable: "リンクを知っている人が見られる",
    enabledNote: "リンクを開いた人は、見るだけの画面になります",
    disabledNote: "オフの間は、リンクを持っていても開けません",
    noKey:
      "この作品にはまだ共有用の鍵がありません。supabase/schema.sql をSupabaseのSQL Editorで実行すると使えるようになります。",
    everyone: "みんなに配るリンク",
    copy: "リンクをコピー",
    copied: "コピーしました",
    perDancer: "一人ひとりに配るリンク",
    perDancerNote:
      "開いた時点でその人が選ばれます。見られる範囲は同じで、他の人の道順も見られます。",
    regenerate: "リンクを作り直す",
    regenerateTitle: "リンクを作り直しますか",
    regenerateDescription:
      "いま配ってあるリンクは、その場で開けなくなります。新しいリンクを配り直してください。",
    regenerateConfirm: "作り直す",
    regenerated: "新しいリンクにしました",
    regenerateFailed: "リンクを作り直せませんでした",
    copyFailed: "コピーできませんでした",
    saveFailed: "共有の設定に失敗しました",
    musicNote:
      "曲は付いていきません(音源はこの端末から出ないため)。相手の画面では曲の開始位置は共有されるので、選んでもらえれば位置は合います。",
    sharing: "共有中。リンクを開く",
  },

  review: {
    errors: {
      notConfigured: "診断は設定されていません",
      needsSignIn: "ログインしてからお試しください",
      unreadable: "読み取れませんでした",
      noFormation: "隊形がありません",
      emptyScene: "このシーンにはまだ誰も居ません",
      unavailable: "診断が取れませんでした。しばらくしてからお試しください",
      // 待っても直らないもの。文言で「こちらの直しが要る」と分かるようにする
      modelMissing: "診断の相手が見つかりませんでした。設定の直しが必要です",
      rejected: "診断の鍵が断られました。設定の直しが必要です",
      // こちらは待てば直る
      busy: "診断が混み合っています。少し待ってからお試しください",
      empty: "診断が空でした。もう一度お試しください",
    },
    title: "隊形を見てもらう",
    note: "いま開いているシーンの立ち位置だけを送ります。作品名やダンサーの色は送りません。返ってくるのは判定ではなく、考えるための材料です。",
    run: "見てもらう",
    running: "見てもらっています...",
    again: "もう一度",
    failed: "診断が取れませんでした",
    offline: "通信できませんでした",
  },

  exportVideo: {
    title: "動画にする",
    unsupported:
      "この端末のブラウザでは動画を書き出せません。パソコンの Chrome か、新しい iPhone の Safari でお試しください。",
    needsTwoScenes: "シーンが2つ以上あると、その間の動きを動画にできます。",
    size: "大きさ",
    showNames: "名前を出す",
    showNamesNote: "人数が多いときは、切ると隊形が読みやすくなります",
    running: (seconds: number) =>
      `書き出し中… 残り ${seconds}秒。この画面を閉じずにお待ちください。`,
    cancel: "中止する",
    note: "書き出しには作品と同じだけ時間がかかります(実際に動かしながら録っているため)。音は入りません。",
    saved: "動画を保存しました",
    failed: "書き出しに失敗しました",
  },

  music: {
    title: "曲",
    pick: "端末から曲を選ぶ",
    pickAnother: "別の曲を選ぶ",
    file: "曲のファイル",
    remove: "曲を外す",
    keptOnDevice: "この端末に控えてあります。開き直しても入ったままです。",
    notShared:
      "音源はこの端末から出ません。作品を共有しても曲は付いていかないので、相手には同じ曲を選んでもらってください(開始位置は共有されます)。",
    metronomeTitle: "曲がないときの拍",
    metronomeNote:
      "曲を用意する前でも、振付の速さを耳で確かめられます。再生ボタンを押している間だけ鳴ります。",
    metronome: "メトロノーム",
    click: "クリックを鳴らす",
    bpm: "速さ(BPM)",
    beatsPerBar: "拍子",
    beatsPerBarNote:
      "数える単位(8カウント)は拍子では変わりません。ここで変わるのは、メトロノームで強く鳴る拍と、時間軸で太く引く線だけです。",
    offset: "曲の開始位置",
    seconds: "秒",
    offsetNote:
      "振付が曲の途中から始まるときに使います。イントロが12.5秒あるなら12.5と入れると、再生ボタンでそこから鳴ります。",
    offsetFailed: "曲の開始位置の保存に失敗しました",
    span: (total: number, from: string, to: string) =>
      `通しで ${total}秒 · ${from} 〜 ${to}`,
    counts: (set: number, count: number) => `${set}セット ${count}カウント`,
    zoomIn: "時間軸を寄せる",
    zoomOut: "時間軸を引く",
    pxPerSecond: "px/秒",
    stacked: (from: number, to: number) =>
      `シーン${from}〜${to}が重なっています。押すと広げて、1つずつ選びます`,
    scenesShort: "シーン",
  },

  dancer: {
    add: {
      title: "ダンサーを追加",
      howMany: "何人追加しますか?",
      minus: "1人減らす",
      plus: "1人増やす",
      count: "追加する人数",
      people: "人",
      autoNote: "名前と色は自動で決まります（あとで変更できます）",
      spotsNote:
        "いま見ているシーンの空いているマスに、中央から順に並びます。重ならないので、そのままドラッグで動かせます。",
      submit: (n: number) => `${n}人を追加する`,
      cancel: "キャンセル",
      addedOne: (name: string) => `${name} をステージに追加しました`,
      addedMany: (n: number) => `${n}人をステージに追加しました`,
      failed: "ダンサーの追加に失敗しました",
    },
    list: {
      title: "ダンサー",
      empty: "このシーンにはまだ誰もいません。",
    },
    inspector: {
      name: "ダンサー名",
      ownDuration: "このダンサーだけの遷移時間(秒)",
      seconds: "秒",
      focus: "マイ・フォーカス",
      focusOn: "マイ・フォーカス中",
      remove: "ダンサーを削除",
      deselect: "選択を解除",
      changeColor: (color: string) => `色を${color}に変更`,
      rotate: "向きを変更",
      curve: (name: string) => `${name}の曲線の形を調整`,
      deleteTitle: (name: string) => `「${name}」を削除しますか?`,
      deleteDescription:
        "このダンサーの配置と導線が、すべてのシーンから消えます。削除は元に戻せません(移動や向きの変更は戻せます)。",
      deleteMeta: (scenes: number) => `${scenes} シーンぶんの配置`,
      durationFailed: "個別の遷移時間の変更に失敗しました",
      nameFailed: "ダンサー名の変更に失敗しました",
      colorFailed: "色の変更に失敗しました",
      deleteFailed: "ダンサーの削除に失敗しました",
    },
    badges: {
      blindSpot: {
        text: (name: string) => `${name}: 手前の人に重なって、客席から見えません`,
        heading: "顔被りチェック",
        body: "客席から見て、手前の人の真後ろに入っている人に付きます。いま画面に出ている隊形だけを見ていて、移動の途中は数えません。",
      },
      collision: {
        text: (name: string, seconds: string, other: string) =>
          `${name}: 移動を始めて約${seconds}秒後に ${other} とぶつかります`,
        heading: "衝突のおそれ",
        body: "導線が交差しているだけでは出ません。実際にその時刻に同じ場所へ来る2人にだけ付きます。どちらかの出発を遅らせるか、導線を曲げてください。",
      },
      excessiveMove: {
        text: (name: string, meters: string, seconds: number, speed: string) =>
          `${name}: 次のシーンまで約${meters}mを${seconds}秒。約${speed}m/s は走らないと間に合いません`,
        heading: "移動が速すぎます",
        body: "歩いて間に合いません。時間軸でこのシーンを右へ引くと、移動に使える時間が延びます。",
      },
    },
  },

  settings: {
    title: "設定",

    stage: {
      title: "舞台",
      summary: "客席の向き・新しい作品の広さ",
      description:
        "向きを変えても、保存されている立ち位置は動きません。描く向きと、道順の言葉づかいだけが入れ替わります。",
      audienceOnTop: {
        label: "客席を上にする",
        description:
          "既定は上がバックステージ。稽古場で鏡を見ながら組むときに入れ替える",
      },
      width: "ステージの幅",
      depth: "ステージの奥行き",
      depthDescription:
        "1マス = 90cm。ここで決めるのは、これから作る作品の広さです",
      unit: "マス",
    },

    grid: {
      title: "目盛り",
      summary: "格子への吸着・センターライン",
      snap: {
        label: "格子に吸着させる",
        description: "切ると、どこにでも置けます",
      },
      centerLine: {
        label: "センターラインを強調",
        description: "中央(0の列)を目立たせます",
      },
    },

    playback: {
      title: "再生",
      summary: "カウントイン・既定の速さ・シーンの間隔",
      countIn: {
        label: "カウントイン",
        description: "再生を押してから、実際に動き出すまでに鳴らす拍",
        off: "なし",
        beats: (n: number) => `${n}拍`,
      },
      bpm: {
        label: "既定の速さ",
        description: "曲を入れていないときの物差し。新しく作る作品に入ります",
        unit: "BPM",
      },
      segment: {
        label: "シーンの間隔",
        description:
          "シーンを足したとき、いまの位置から何秒後に置くか。120BPMなら4秒が1つの8カウント",
        unit: "秒",
      },
    },

    display: {
      title: "表示",
      summary: "ダンサー名・導線・バミリ・顔被り・払って送る",
      description:
        "下の4つは、エディタの「表示とモード」と同じスイッチです。どちらから変えても同じ状態を指します。",
      dancerName: {
        label: "ダンサー名",
        description: "人数が多いと名前で埋まる。選択時だけにすると隊形が読みやすい",
        always: "常に",
        selected: "選択時",
        never: "出さない",
      },
      path: {
        label: "導線",
        description: "次のシーンへの動きを線で描きます",
      },
      stageMarks: {
        label: "バミリ",
        description: "全シーンの立ち位置を、床の印として重ねます",
      },
      blindSpot: {
        label: "顔被りチェック",
        description: "手前の人の真後ろに入って、客席から見えない人に印を付けます",
      },
      swipe: {
        label: "払ってシーンを送る",
        description: "ステージを横になぞると、前後のシーンへ移ります",
      },
    },

    app: {
      title: "アプリ",
      summary: "言語・見た目・自動保存",
      description:
        "「明るい」は紙の隊形図の見た目になります。細かく選ぶときはホームのパレットから。",
      colorScheme: {
        label: "見た目",
        dark: "暗い",
        light: "明るい",
        system: "端末",
      },
      autoSave: {
        label: "自動保存",
        description: "切ると、変更はヘッダーの保存を押すまで送られません",
        failed: "保存に失敗しました",
      },
    },

    data: {
      title: "データ",
      summary: "書き出し・取り込み・中身を全部消す",
      description:
        "曲は入りません(音源はこの端末から出ないため)。取り込みは、いまの作品を上書きせず別の作品として作ります。",
      export: {
        label: "この作品を書き出す",
        description: "JSONで手元に保存します",
      },
      import: "ファイルから取り込む",
      // 「削除」にはしない。**作品そのものは残る**(消えるのは中身だけ)。
       // 作品を消すのは一覧のゴミ箱で、そちらと同じ言葉にすると取り違える
      reset: {
        label: "この作品の中身を全部消す",
        description: "シーンとダンサーが全部消えます。作品そのものは残ります",
      },
    },

    account: {
      title: "アカウント",
      summary: "別のアカウントで入る・ログアウト・設定を戻す",
      switch: {
        label: "別のアカウントでログイン",
        description:
          "いまのアカウントからログアウトして、ログイン画面へ移ります",
        confirmTitle: "別のアカウントでログインしますか",
        confirmDescription:
          "いまのアカウントからは一度ログアウトします。作品はアカウントに紐づいているので、別のアカウントからは見えません。",
        confirmLabel: "ログアウトして移る",
      },
      signOut: "ログアウト",
      resetSettings: {
        label: "設定を既定に戻す",
        description: "この画面の選択だけを戻します。作品には触れません",
      },
    },
  },
};

export type Messages = typeof ja;
