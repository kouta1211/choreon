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
    matchingCast: (n: number) =>
      `いまステージにいる${n}人に合わせて表示しています`,
    forCast: (n: number) => `${n}人ぶんの形です。`,
    leftOver: (n: number) =>
      `余る${n}人はいまの位置のまま残ります（消えません）。`,
    emptySpots: (n: number) => `${n}点は空きになります（前列から埋めます）。`,
    title: "フォーメーション",
    needsTwo: "2人以上",
    spacingLabel: "間隔",
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
    backToStart: "始め方を選ぶ画面に戻る",
    addDancer: "ダンサーを追加",
    projectName: "プロジェクト名",
    projectNameFailed: "プロジェクト名の変更に失敗しました",
    upstage: "バックステージ",
    /** 客席から見た左右。x は反転しないので、この2つは入れ替わらない */
    houseLeft: "下手",
    houseRight: "上手",
    downstage: "客席側",
    noScenes: "シーンがありません",
    /** シーンがまだ無いまま曲だけ流しているとき（2026-08-22） */
    musicOnly: "曲だけ流しています",
    noScenesYet: "まだシーンがありません",
    /** 音先の作品で、曲は鳴っているがまだ最初のシーンへ着いていない間 */
    beforeFirstScene: "ここにはまだシーンがありません",
    createFirstScene: "最初のシーンを作る",
    copyCurrent: "いまの配置をコピーして追加",

    /** スマホ幅で作成画面を開いた人への案内（2026-08-18 の方針転換） */
    narrowScreen: {
      title: "今のブラウザ幅では操作できません",
      /** 改行の位置は user が決めたもの。whitespace-pre-line でそのまま出す */
      body: "スマホでの閲覧機能のため、\nこのブラウザ幅での操作を制限しています。\n操作を続けたい場合は、ブラウザ幅を広げてください。",
      openViewer: "見るだけならこちら",
      pasteLabel: "共有リンクを貼って開く",
      pastePlaceholder: "https://... または /view/...",
      pasteOpen: "開く",
      pasteInvalid: "共有リンクとして読めませんでした。配られた URL をそのまま貼ってください。",
    },

    view: {
      /**
       * ボタンの名前。**「表示とモード」をやめた**（2026-08-17）。
       * 中身の半分（曲・共有・動画・見てもらう・チュートリアル・設定）は
       * 表示の切り替えではないので、名前が中身に嘘をついていた。
       * 見えているものを言うなら、これは「メニュー」。
       */
      title: "メニュー",
      /** 中の仕切り。表示の切り替えはここだけ */
      stageGroup: "ステージの見せ方",
      appGroup: "アプリ",
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
      /* 警告の残り2つ（2026-09-01）。設定の「警告」と同じスイッチを指す —
         どちらから変えても同じ状態でなければならない */
      collision: {
        label: "衝突チェック",
        description: "移動の途中でぶつかる組み合わせに印を出す",
      },
      moveStrain: {
        label: "速すぎる移動",
        description: "歩いて間に合わない速さの移動に印を出す",
      },
      stageMarks: {
        label: "バミリ",
        description: "全シーンの立ち位置を床に重ねて出す",
      },
      thisProject: "この作品",
      music: "曲",
      share: "共有",
      review: "隊形を見てもらう",
      assist: "言葉で頼む",
      exportVideo: "動画にする",
      tour: "チュートリアルを開始する",
      settings: "設定",
    },

    /** キーボードとマウスでできること。組と並びは
        features/canvas/lib/shortcutList.ts が持つ */
    shortcuts: {
      title: "キーボード操作",
      description: "作る画面（PC・タブレット）で使えます。",
      hint: "この一覧は ? キーでも開けます",
      groups: {
        play: "再生",
        select: "選ぶ",
        move: "動かす",
        undo: "やり直す",
      },
      items: {
        playPause: "再生 / 停止",
        prevNextScene: "前の / 次のシーンへ",
        selectAll: "そのシーンに立っている全員を選ぶ",
        addToSelection: "選択に足す",
        subtractFromSelection: "囲んだ人を選択から外す",
        clearSelection: "選択を解く・開いている板を閉じる",
        nudgeSmall: (units: number) => `${units} マスずつ動かす`,
        nudgeLarge: (units: number) => `${units} マスずつ動かす`,
        contextMenu: "向き・整列・削除のメニューを出す",
        undo: "元に戻す",
        redo: "やり直す",
        browserBack: "ブラウザの戻るでも、元に戻せます",
      },
      keys: {
        click: "クリック",
        drag: "囲む",
        rightClick: "右クリック",
        back: "戻る",
      },
    },

    dock: {
      openScenes: "シーン一覧を開く",
      cancelCountIn: "カウントインを取り消す",
      pause: "再生を停止",
      play: "最後のシーンまで再生",
      /** シーンがまだ無いとき。進む先が無いので「最後のシーンまで」は嘘になる */
      playMusicOnly: "曲を流す",
      sceneSettings: (name: string) => `「${name}」の設定を開く`,
      /** カウントで数えた移動の長さ。位置（3-5）とは別の形で書く */
      moveCounts: (counts: string) => ` · ${counts}カウントで移動`,
      addScene: "シーンを追加",
      /** 曲があるときは鳴らしている最中しか増やせない（canAddScene） */
      addSceneNeedsPlayback: "曲を流しながら押すと、その位置にコマができます",
      hideTimeline: "時間軸を畳む",
      showTimeline: "時間軸を出す",
      playFromHere: "いま見ているシーンから流す",
      playFrom: (name: string) => `「${name}」から流す（前回はじめた場所）`,
    },

    scenes: {
      /** 位置の欄の見出し。打つのはカウント（3-5）で、秒ではない */
      countPosition: "カウント",
      counts: "カウント",
      seconds: "秒",
      title: "シーン",
      dancers: "ダンサー",
      sceneName: "シーン名",
      summary: (count: number, counts: string) =>
        `${count}件 · 通し ${counts}カウント`,
      /** 一覧の行に出す、**次のシーンへ出ていく**区間の秒数。
       *  下に出している滞在／移動と同じ区間でなければならない
       *  （2026-08-25 まで、ここだけ入ってくる側を出していた） */
      moveOut: (counts: string) => ` · 次へ ${counts}`,
      /** 区間を2つに割る欄の見出し。どちらにも打てる */
      /** ⚠️ **どちらも「このシーンから出ていく区間」の話**。
       *  滞在＝このシーンの隊形のままでいるカウント数、
       *  移動＝そこから次のシーンへ動くのに使うカウント数。
       *  **単位（カウント）を見出しに入れる**（2026-08-31）。
       *  「滞在」「移動」だけでは何の数か読めず、かといって
       *  「このフォーメーションの滞在」まで書くと長い */
      hold: "滞在カウント",
      holdLabel: "この隊形のまま止まっているカウント数",
      move: "移動カウント",
      moveCountsLabel: "次のシーンへ動くのに使うカウント数",
      /** 割っている区間の長さ。バーの上に添える */
      segmentTotalCounts: (counts: string) => `区間 ${counts}カウント`,
      /** 区間バー本体。左が滞在、右が移動 */
      splitBar: "滞在と移動の境目",
      splitBarValue: (hold: number, move: number) =>
        `滞在 ${hold}カウント、移動 ${move}カウント`,
      delete: "削除",
      /** まとめて消すための「選ぶ」モード（一覧の見出しの右） */
      select: "選ぶ",
      selectDone: "やめる",
      selectAll: "全部を選ぶ",
      selectNone: "全部を外す",
      selectHint: "消したいシーンを押してください",
      deleteChecked: (count: number) => `${count}件を削除`,
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
      /** 修飾キーの綴りは端末で変わる（Mac は ⌘）。useModifierLabel から渡す */
      undoHint: (mod: string) => `元に戻す (${mod}+Z)`,
      redo: "やり直す",
      redoHint: (mod: string) => `やり直す (${mod}+Shift+Z)`,
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

    /** 右クリックのメニュー(PC 特化)。ダンサーの上と、ステージの地とで中身が変わる */
    contextMenu: {
      facing: {
        heading: "向き",
        /** 升の並びだけでは、左右がどちらから見た向きか分からない */
        note: "左右は客席から見て",
        front: "客席",
        frontLeft: "客席の左",
        left: "左",
        backLeft: "奥の左",
        back: "奥",
        backRight: "奥の右",
        right: "右",
        frontRight: "客席の右",
        /** 升の読み上げ名 */
        turn: (label: string) => `${label}を向く`,
      },
      /** 選んだ人たちを揃える。2人以上選んでいるときだけ出す */
      align: {
        heading: "整列",
        /** 揃え先が誰かではなく重心であることを、押す前に伝える */
        note: "重心に合わせます",
        row: "横一列に揃える",
        column: "縦一列に揃える",
        spreadX: "左右に等間隔",
        spreadY: "前後に等間隔",
      },
      deleteOne: "削除",
      deleteMany: (count: number) => `${count}人を削除`,
      deleteManyTitle: (count: number) => `${count}人を削除しますか?`,
      deleteManyMeta: (positions: number) => `${positions} 件の配置`,
      selectAll: "全員を選ぶ",
      addDancer: "人を足す",
    },

    /** 掴み分けられないほど重なる所へ置こうとしたときの念押し */
    overlap: {
      title: (name: string) => `${name} と重なります`,
      titleMany: (count: number) => `${count}人と重なります`,
      description:
        "そのまま置くと、上に居る人しか掴めなくなります。すこしずらして置きますか?",
      confirm: "ずらして置く",
    },

    errors: {
      metronome: "クリックの設定を保存できませんでした",
      position: "位置の保存に失敗しました",
      rotation: "向きの保存に失敗しました",
      curve: "曲線の変更に失敗しました",
      retry: "再試行",
    },
  },

  common: {
    close: "閉じる",
    /** 数を入れる欄で、入れたものを直したときの理由 */
    numberField: {
      notANumber: "数を入れてください",
      tooSmall: (min: number) => `${min} より小さくはできません`,
      tooLarge: (max: number) => `${max} より大きくはできません`,
      /** 押すまで変わらない形にした（実機報告 12-2 / 12-10）。
       *  ボタンは束の下に1つ常設する形へ（03-17）。言葉も「適用」で揃える */
      apply: "適用",
      applyCount: (count: number) => `適用（${count}件）`,
      /** 範囲の外・数でないものが残っている間は押せない（実機報告 12-9） */
      fixRange: "入れられる範囲に直してください",
      notApplied: "適用を押すまで変わりません",
      applied: "適用しました",
    },
    back: "戻る",
    loading: "読み込み中",
    rename: (label: string) => `${label}を変更`,
    saveToCloud: "保存",
    settings: "設定",
    appearance: "見た目を変える",
    undoFailed: "元に戻す操作に失敗しました",
    redoFailed: "やり直す操作に失敗しました",
    undoTargetGone: "対象が削除されているため元に戻せませんでした",
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
    haveAccount: "既にアカウントをお持ちの方は",
    noAccount: "アカウントをお持ちでない方は",
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
    draftPending:
      "確認が済むまで作品は保存されません。このタブを閉じずに、メールのリンクを開いてから戻ってください。",
  },

  /** 未ログインで開いたときに最初に出る、始め方を選ぶ画面 */
  welcome: {
    lastViewed: {
      label: "前に見た振付",
    },
    guestStart: "ゲストで始める",
    withTour: "使い方の案内から始める",
    tourAsk: {
      title: "使い方の案内を見ますか？",
      body: "ステージ・ダンサー・シーンの3つを、実際の画面を指しながら1分ほどで案内します。",
      withTour: "案内から始める",
    },
    or: "または",
  },

  projects: {
    count: (n: number) => `プロジェクト ${n}件`,
    empty: "まだプロジェクトがありません。",
    emptyHint: "上の入力から曲名を入れると、ステージが1つ立ち上がります。",
    newTitle: "新しい作品",
    newName: "作品の名前",
    create: "プロジェクトを作成",
    createFailed: "プロジェクトの作成に失敗しました",
    renamedForClash: (title: string) =>
      `同じ名前があったので「${title}」で作りました`,
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
    /** 履歴で戻せるものとの違い。ここが無いと「元に戻す」で戻せると思われる */
    undoableNote: "（移動や向きの変更は「元に戻す」で戻せます）",
    cancel: "キャンセル",
    deleting: "削除中...",
    delete: "削除する",
  },

  tour: {
    stageTitle: "ここが舞台です",
    /** 上下は「客席を上にする」で入れ替わるので、**向きを言い切らない**。
        札そのものを指せば、どちらの設定でも正しい */
    stageBody:
      "ステージの上下に、バックステージと客席側の札が出ています。丸がダンサーで、掴んで動かせます。目盛りはセンターからの位置です。",
    /** どの作品でもカウントで組む（2026-08-26）。曲の有無で言い分けない */
    timelineTitle: "横の位置が、カウントです",
    timelineBody:
      "コマは「何セット目の何カウントか」の位置に並びます（3-5 は3セット目の5カウント）。コマを横に引くとその位置が動き、間隔がそのまま次の隊形へ移るカウント数になります。",
    addTitle: "隊形を足す",
    addBody:
      "選んでいるシーンの隣に、いまの配置をコピーした隊形を作ります。作ってから動かす、が基本の流れです。曲を鳴らしているときは、聞いている位置にできます。",
    viewTitle: "メニュー",
    viewBody:
      "目盛り・導線・顔被りの警告などの切り替えと、曲・動画・設定への入口がここにあります。この案内をもう一度見るのもここから。",
    back: "戻る",
    close: "閉じる",
    last: "はじめる",
    next: "次へ",
    nextWithProgress: "次へ（{current}/{total}）",
    skip: "skip",
  },

  notFound: {
    title: "見つかりません — Choreon",
    heading: "このページは見つかりませんでした",
    /* 存在しない作品と、見せてよくない作品を区別せずに閉じている
       （その先に作品があること自体を教えないため）。だから
       **リンクを配られた人**に向けて書く */
    body: "アドレスが違うか、共有リンクが作り直されて開けなくなっています。リンクを配った人に、新しいものをもらってください。",
    toProjects: "作品の一覧へ",
  },

  offline: {
    title: "オフライン — Choreon",
    heading: "いま電波が届いていません",
    body: "一度開いた画面は、そのまま見られます。直前の画面へ戻るか、電波が戻ってから開き直してください。",
    toProjects: "作品の一覧へ",
    /** 端末に控えてある「最後に開いた振付」への戻り道 */
    lastViewed: (title: string) => `「${title}」へ戻る`,
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
    moveSecondsFailed: "移動カウントの変更に失敗しました",
    deleteManyTitle: (count: number) => `${count} 件のシーンを削除しますか?`,
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
    /** スマホを横にしたときの案内（閲覧画面は縦スクロールで読む作り） */
    rotate: {
      title: "縦向きでご覧ください",
      body: "横向きだとステージで画面が埋まって、下の道順が読めません。端末を縦に戻すと、そのまま続きが見られます。",
    },
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
      change: "変える",
      title: (name: string) => `${name} の道順`,
      me: "自分",
      everyone: "全員",
      all: "全て",
      summary: (scenes: number, total: string) =>
        `${scenes} シーン · 通し ${total}`,
      lastFormation: "ここが最後の隊形です",
      /** 道順の一覧の1行目。最初のシーンには「移動」が無い */
      startHere: "ここから始まります",
      stepsNote: "歩数は 1歩 60cm・1マス 90cm で計算した目安です。",
      sidesNote: "上手／下手は客席から見た向きです。",
      fast: " — 速め",
      travelCounts: (counts: string) => `${counts}カウントかけて`,
      /** 道順の1行の後ろに添える形。括弧の形は言語で変わる */
      travelCountsAside: (counts: string) => `（${counts}カウントかけて）`,
      hereNow: " · 現時点",
      tooFast: "歩いて間に合わない速さです",
      reselect: "ポジションを選び直す",
      /** 右から出るシーン一覧（実機の要望 2026-08-19） */
      sceneListOpen: "シーン一覧を開く",
      sceneListTitle: "シーン",
      sceneListNote: "押すとそのシーンへ移ります",
      /** 見る画面の表示の切り替え（実機の要望 2026-08-19） */
      viewMenu: "表示を変える",
      showNames: "名前を出す",
      play: "通しで再生",
      stop: "止める",
      paths: "導線",
    },
    entry: {
      question: "あなたはどれですか",
      note: "選択後、あなたにフォーカスします。",
      position: (name: string) => `${name} の立ち位置`,
      /** 作品の見出しに添える規模。見る人が最初に読む1行 */
      counts: (scenes: number, dancers: number, total: string) =>
        `${scenes} シーン · ${dancers} 人 · ${total}`,
      pick: "自分を選んでください",
      pickNamed: (name: string) => `「${name}」で見る`,
      skip: "選ばずに全員を見る",
    },
  },

  share: {
    title: "共有",
    enable: "リンクを知っている人が見られる",
    resume: "もう一度このリンクで共有する",
    enabledNote:
      "リンクを開いた人は、自分にフォーカスしたフォーメーションを閲覧できます。",
    disabledNote: "いまは共有していません。リンクを持っている人も開けません",
    noKey:
      "この作品にはまだ共有用の鍵がありません。supabase/schema.sql をSupabaseのSQL Editorで実行すると使えるようになります。",
    everyone: "共有リンク",
    copy: "リンクをコピー",
    copied: "コピーしました",
    regenerate: "リンクを作り直す",
    regenerateTitle: "リンクを作り直しますか",
    regenerateDescription:
      "いま配ってあるリンクは、その場で開けなくなります。新しいリンクを配り直してください。",
    regenerateConfirm: "作り直す",
    regenerated: "新しいリンクにしました",
    regenerateFailed: "リンクを作り直せませんでした",
    copyFailed: "コピーできませんでした",
    saveFailed: "共有の設定に失敗しました",
  },

  /** 言葉で頼む（操作のサポート）。AIが選ぶのは操作だけで、数はアプリが出す */
  assist: {
    title: "言葉で頼む",
    note: "したいことを書いてください。できることの中から選んで、やることを先に見せます。",
    inputLabel: "したいこと",
    placeholder: "顔被りを全部直して",
    ask: "頼む",
    asking: "考えています...",
    again: "もう一度頼む",
    examples: "たとえば",
    exampleList: [
      "顔被りを全部直して",
      "バミリを出して",
      "3番目のシーンを開いて",
      "横1列に並べて",
      "床の線を同心円にして",
    ],
    /** 確認。押すまで何も起きない */
    confirm: "これで進める",
    cancel: "やめる",
    undoHint: "元に戻すで消えます",
    /** 表示・場所の呼び名。画面に出ている言葉と同じにする */
    targets: {
      paths: "導線",
      blindSpot: "顔被りチェック",
      marks: "バミリ",
      music: "曲",
      share: "共有",
      video: "動画にする",
      settings: "設定",
      review: "隊形を見てもらう",
      template: "フォーメーションから選ぶ",
      addDancer: "ダンサーを追加",
    },
    /** やることの説明。**数字はここでアプリが入れる** */
    plan: {
      clearBlindSpots: (count: number) => `顔被りを直す（${count}人）`,
      movesSideways: (name: string, from: number, to: number) =>
        `${name}番を ${from} → ${to} へ（横だけ）`,
      noEscape: (name: string) => `${name}番は逃げ場が無いので、そのまま`,
      thisSceneOnly: "いま開いているシーンだけ。前後は動きません",
      extendFastMoves: (count: number) => `移動に時間を足す（${count}件）`,
      retime: (sceneName: string, from: number, to: number) =>
        `「${sceneName}」を ${from}秒 → ${to}秒 へ`,
      walkable: (name: string) => `${name}番が歩ける速さになります`,
      rippleNote: "以降のシーンも一緒に後ろへずれます",
      applyFormation: (name: string, count: number) =>
        `${count}人を「${name}」に並べる`,
      nearestAssignment: "いまの位置から、いちばん近い場所へ割り当てます",
      setGrid: (name: string) => `床の線を「${name}」にしました`,
      turnedOn: (name: string) => `${name}を出しました`,
      turnedOff: (name: string) => `${name}を消しました`,
      alreadyOn: (name: string) => `${name}はもう出ています`,
      alreadyOff: (name: string) => `${name}はもう消えています`,
      opened: (name: string) => `${name}を開きました`,
      selectScene: (number: number, name: string) =>
        `${number}番「${name}」を開きました`,
    },
    /** 何もすることが無かったとき */
    nothingToDo: "いまは、することがありません",
    errors: {
      notConfigured: "この機能はまだ設定されていません",
      needsSignIn: "ログインしてからお試しください",
      unreadable: "読み取れませんでした",
      tooLong: "頼み事が長すぎます。短く書いてください",
      notUnderstood:
        "うまく読み取れませんでした。「顔被りを全部直して」のように、したいことを1つだけ書いてみてください",
      unavailable: "うまくいきませんでした。しばらくしてからお試しください",
      modelMissing: "頼む相手が見つかりませんでした。設定の直しが必要です",
      rejected: "頼むための鍵が断られました。設定の直しが必要です",
      rateLimited:
        "頼める回数の上限に達しました。少し時間をおいてからお試しください",
      busy: "いま混み合っています。少し待ってからお試しください",
      tooSlow: "返事に時間がかかりすぎました。もう一度お試しください",
      empty: "返事が空でした。もう一度お試しください",
    },
  },

  review: {
    errors: {
      notConfigured: "この機能はまだ設定されていません",
      needsSignIn: "ログインしてからお試しください",
      unreadable: "読み取れませんでした",
      noFormation: "隊形がありません",
      emptyScene: "このシーンにはまだ誰も居ません",
      unavailable: "見てもらえませんでした。しばらくしてからお試しください",
      // 待っても直らないもの。文言で「こちらの直しが要る」と分かるようにする
      modelMissing:
        "見てもらう相手が見つかりませんでした。設定の直しが必要です",
      rejected: "見てもらうための鍵が断られました。設定の直しが必要です",
      // こちらは待てば直る
      rateLimited:
        "頼める回数の上限に達しました。少し時間をおいてからお試しください",
      busy: "いま混み合っています。少し待ってからお試しください",
      tooSlow: "返事に時間がかかりすぎました。もう一度お試しください",
      empty: "返事が空でした。もう一度お試しください",
      /** 型付きで頼んだのに崩れて返った。**生の JSON を画面へ出さないため** */
      garbled: "返事が途中で切れました。もう一度お試しください",
    },
    title: "隊形を見てもらう",
    note: "いま開いているシーンの立ち位置だけを送ります。作品名やダンサーの色は送りません。返ってくるのは判定ではなく、考えるための材料です。",
    /** 指摘1件ごとの見出し。良いところに直しは付かない */
    good: "良いところ",
    watch: "気になるところ",
    /** 直しのボタンについて。押すまで何も起きないことを先に言う */
    decide:
      "直しのボタンは、押したときだけ当たります。取り入れるかどうかは自分で決めてください（元に戻すで消えます）。",
    applied: "当てました",
    /** 隊形の例（図つき）。名前だけでは並びが読めないので図を出す */
    formationExample: "こう並べると",
    formationApply: "この並びにする",
    formationNote: "いまの位置から、いちばん近い場所へ割り当てます",
    audienceSide: "客席側",
    /** このシーンだけ / 作品ぜんぶ */
    scope: "見てもらう範囲",
    scopeScene: "このシーン",
    scopePiece: "作品ぜんぶ",
    scopePieceNote:
      "全シーンの散り具合・重心・警告だけを送ります（立ち位置そのものは送りません）。流れの話が返ってきます。",
    /** 作品ぜんぶのとき、その指摘がどのシーンの話か */
    inScene: (number: number, name: string) => `${number}. ${name}`,
    wholePiece: "作品ぜんぶ",
    run: "見てもらう",
    running: "見てもらっています...",
    again: "もう一度",
    failed: "見てもらえませんでした",
    offline: "通信できませんでした",
  },

  exportVideo: {
    title: "動画にする",
    unsupported:
      "この端末のブラウザでは動画を書き出せません。パソコンの Chrome か、新しい iPhone の Safari でお試しください。",
    needsTwoScenes: "シーンが2つ以上あると、その間の動きを動画にできます。",
    size: "大きさ",
    showNames: "名前を出す",
    running: (seconds: number) =>
      `書き出し中… 残り ${seconds}秒。この画面を閉じずにお待ちください。`,
    cancel: "中止する",
    start: (seconds: number) => `${seconds}秒の動画を作る`,
    note: "書き出しには作品と同じだけ時間がかかります(実際に動かしながら録っているため)。",
    contains:
      "入るのは、ステージ・格子・ダンサー(向きの三角つき)・上下の札・時刻です。",
    omits: "メトロノームのクリックは入りません。",
    includeTitle: "重ねるもの",
    /** 音は重ね物ではないので別の区切り。曲が無い作品では出さない */
    includeAudioTitle: "音",
    includeAudio: "曲を入れる",
    includeAudioNote:
      "曲の頭から、動画の長さぶんだけ入ります。書き出し中は鳴りません。",
    includeAudioWarning:
      "この動画には曲が入ります。渡す相手に気をつけてください（共有リンクには今までどおり曲は付いていきません）。",
    saved: "動画を保存しました",
    failed: "書き出しに失敗しました",
  },

  music: {
    title: "曲",
    pick: "端末から曲を選ぶ",
    pickAnother: "別の曲を選ぶ",
    file: "曲のファイル",
    remove: "曲を外す",
    titleFailed: "曲の名前を保存できませんでした",
    missingOnDevice:
      "音源はこの端末にありません(曲は作品に覚えてあります)。同じ曲をもう一度選ぶと鳴ります。",
    notShared:
      "この端末に控えるので開き直しても鳴りますが、共有した相手には付いていきません(開始位置だけ共有されます)。",
    metronomeTitle: "曲がないときの拍",
    metronome: "メトロノーム",
    click: "クリックを鳴らす",
    bpm: "速さ(BPM)",
    /** 数の右に添える単位。ラベルと二重に「速さ(BPM)」と出さない */
    bpmUnit: "BPM",
    bpmNote: "時間軸のバーの取っ手を引いても、同じ速さが変わります",
    beatsPerBar: "拍子",
    beatsPerBarNote:
      "変わるのはメトロノームの強い拍と、時間軸の太い線だけです(8カウントの数え方は変わりません)。",
    seconds: "秒",
    span: (total: number, from: string, to: string) =>
      `通しで ${total}秒 · ${from} 〜 ${to}`,
    counts: (set: number, count: number) => `${set}セット ${count}カウント`,
    /* ── 曲へ載せる（第3段・2026-08-26）。バーの本体と両端の取っ手 ── */
    placeBar: "振付を曲のどこへ載せるか",
    placeMove: "押すとこの曲の頭へ、引くと振付ぜんぶを前後へ動かす",
    placeStretch: "振付の終わりを合わせる",
    /** バーの上に添える。載っている区間の長さ */
    placeSpan: (from: string, to: string) => `振付 ${from} 〜 ${to}`,
    placeFailed: "曲への載せ方を保存できませんでした",
    zoomIn: "時間軸を寄せる",
    zoomOut: "時間軸を引く",
    pxPerSecond: "px/秒",
    stacked: (from: number, to: number) =>
      `シーン${from}〜${to}が重なっています。押すと広げて、1つずつ選びます`,
    scenesShort: "シーン",
    /* -- 曲の区切り（曲の変わり目）・2026-09-15 --
       ショーケースは1本の中で曲が変わる。振付はカウントで組むので
       拍の列は切れない — 切れるのは載せ方の側だけ */
    sectionsTitle: "曲の区切り",
    sectionsNote:
      "ショーケースの途中で曲が変わるときに使います。区切りを置いても隊形は動きません。置いたあと、その先だけ速さと頭出しを決められます。",
    /** 名前を付けていない区切りの見出し。1始まり */
    sectionDefaultName: (order: number) => `${order}曲目`,
    sectionName: "曲名",
    sectionStart: (clock: string) => `${clock} から`,
    sectionSplit: "ここから別の曲にする",
    sectionSplitNote:
      "選んでいるシーンの、いちばん近い8カウントの頭で区切ります。",
    sectionNeedScene: "区切る場所を決めるために、シーンを選んでください。",
    sectionRemove: "この区切りを外す",
    sectionBpm: "この区間の速さ(BPM)",
  },

  dancer: {
    /** 2人以上を選んでいるときの帯（2026-08-18、複数選択） */
    add: {
      title: "ダンサーを追加",
      howMany: "何人追加しますか?",
      minus: "1人減らす",
      plus: "1人増やす",
      count: "追加する人数",
      people: "人",
      autoNote: "名前と色は決めてあります。ここで直せます",
      /** 名前の欄。打たなければ、下に薄く出ている名前で作る */
      nameLabel: (nth: number) => `${nth}人目の名前`,
      colorLabel: (name: string) => `${name} の色を選ぶ`,
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
      count: (n: number) => `${n}人`,
      empty: "このシーンにはまだ誰もいません。",
      sortLabel: "並べ替え",
      sorts: { added: "追加順", name: "名前順" },
    },
    inspector: {
      name: "ダンサー名",
      seconds: "秒",
      focus: "マイ・フォーカス",
      focusOn: "マイ・フォーカス中",
      remove: "ダンサーを削除",
      deselect: "選択を解除",
      changeColor: (color: string) => `色を${color}に変更`,
      customColor: "自由に色を選ぶ",
      /** 塞がずに知らせるだけ。決めるのは user（2026-08-21） */
    colorHardToSee:
      "いまのテーマでは、舞台の地と見分けにくい色です。このまま使えます。",
    customColorNote: "自由に選んだ色は、テーマを変えてもそのまま出ます",
      rotate: "向きを変更",
      curve: (name: string) => `${name}の曲線の形を調整`,
      deleteTitle: (name: string) => `「${name}」を削除しますか?`,
      deleteDescription:
        "このダンサーの配置と導線が、すべてのシーンから消えます。削除は元に戻せません(移動や向きの変更は戻せます)。",
      deleteMeta: (scenes: number) => `${scenes} シーンぶんの配置`,
      nameFailed: "ダンサー名の変更に失敗しました",
      colorFailed: "色の変更に失敗しました",
      deleteFailed: "ダンサーの削除に失敗しました",
    },
    badges: {
      blindSpot: {
        text: (name: string) =>
          `${name}: 手前の人に重なって、客席から見えません`,
        heading: "顔被りチェック",
        moveOut: "横へずらして顔を出す",
        moveOutNote: "いちばん少なく動く方へ。元に戻すで消えます",
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
        extend: (seconds: number) => `${seconds}秒に延ばす`,
        extendNote: "以降のシーンも一緒に後ろへずれます。元に戻すで消えます",
        body: "歩いて間に合いません。時間軸でこのシーンを右へ引くと、移動に使える時間が延びます。",
      },
    },
  },

  settings: {
    title: "設定",

    /** 効く範囲の案内。ホームと作品の中で文が入れ替わる */
    scope: {
      project: "ここで変えたものは、この作品にだけ効きます。",
      home: "ここで変えたものは、すべての作品に効きます。",
      /** 作品を開いているときの但し書き。**ステージの広さはもうここに
       *  含まれない** — 「舞台」の幅と奥行きは、開いている作品のものへ
       *  変わった（実機報告 03-17）。残るのは「再生」の既定の速さだけ */
      newProjectOnly:
        "「再生」の既定の速さだけは、これから作る作品への初期値です（いま開いている作品の速さは変わりません）。",
      hasOverride: (n: number) => `この作品だけの設定が ${n} 件あります`,
      clear: "この作品だけの設定をやめる",
      cleared: "この作品だけの設定をやめました",
    },

    /**
     * いま開いている作品のステージの広さ（実機報告 03-10）。
     * すぐ上の「舞台」は**新しく作る作品**の初期値で、別物。
     */
    /** 作品を開いているときの「舞台」で使う文。束そのものは stage と1つ */
    projectStage: {
      description: "この作品だけの広さです。1マス = 90cm",
      /** 狭めても止めない。何が起きるかを先に書く（実機報告 03-6） */
      floor: (width: number, height: number) =>
        `${width}×${height} マスより狭くすると、収まらない人は端へ寄ります。1マス = 90cm`,
      moved: (count: number) =>
        `${count}人を端へ寄せました。元に戻すで戻せます`,
      failed: "ステージの広さを保存できませんでした",
    },
    stage: {
      title: "舞台",
      /** 舞台の束は、作品を開いているときだけ出る（2026-08-20） */
      summaryInProject: "この作品のステージの広さ",
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
      summary: "センターライン",
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
        description:
          "再生を押してから、実際に動き出すまでに鳴らす拍。画面の真ん中に残りが出ます。曲を入れていない作品では、数え終わったあとも「クリックを鳴らす」を入れていれば拍が続きます（曲があるときは曲だけが鳴ります）",
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
      summary: "客席の向き・ダンサー名・導線・バミリ",
      description:
        "導線・バミリ は、エディタの メニュー → ステージの見せ方 と同じスイッチです。どちらから変えても同じ状態を指します。",
      dancerName: {
        label: "ダンサー名",
        description:
          "人数が多いと名前で埋まる。選択時だけにすると隊形が読みやすい",
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
    },

    /** 警告の出し入れ（2026-09-01。user の求めで導線と同じように切れるように）。
     *  ⚠️ **切れるのは表示だけ** — AI の講評とアシストは今までどおり見る */
    warnings: {
      title: "警告",
      summary: "顔被り・衝突・速すぎる移動",
      description:
        "ステージのダンサーに付く印です。切っても AI の講評やアシストの提案は今までどおり見ています。",
      blindSpot: {
        label: "顔被り",
        description:
          "手前の人の真後ろに入って、客席から見えない人に印を付けます",
      },
      collision: {
        label: "衝突",
        description: "移動の途中でぶつかる組み合わせに印を付けます",
      },
      moveStrain: {
        label: "速すぎる移動",
        description: "歩いて間に合わない速さの移動に印を付けます",
      },
    },

    shortcuts: {
      title: "キーボード操作",
      summary: "キーとマウスでできることの一覧",
    },
    app: {
      title: "アプリ",
      summary: "言語・見た目・自動保存",
      description:
        "「明るい」は紙の隊形図の見た目になります。細かく選ぶときはホームのパレットから。",
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
      summaryGuest: "ログイン・設定を戻す",
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
      /**
       * ゲスト（未ログイン）のときに出す行。
       * 以前はログインしていなくても「別のアカウントでログイン」「ログアウト」が
       * 出ていた（実機報告 01-17）。**いまのアカウントが無いのに「別の」は無い。**
       */
      signInGuest: {
        label: "ログイン / 新規登録",
        description:
          "いまの下書きはこの端末に残ります。ログインすると作品として保存できます",
      },
      resetSettings: {
        label: "設定を既定に戻す",
        description: "この画面の選択だけを戻します。作品には触れません",
      },
    },
  },
};

export type Messages = typeof ja;
