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
  },

  themes: {
    midnight: "ミッドナイト・ピンク",
    neon: "ネオン・シアン",
    amber: "アンバー・ステージ",
    mono: "モノクローム",
    chalk: "黒板＋チョーク",
    paper: "紙の隊形図",
    gridnote: "方眼ノート＋青インク",
    kraft: "クラフト紙＋活版",
    tracing: "トレーシングペーパー",
    whiteboard: "ホワイトボード＋マーカー",
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
      tour: "使い方をもう一度見る",
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

  settings: {
    title: "設定",

    stage: {
      title: "舞台",
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
      interval: {
        label: "格子の間隔",
        description: "人数が多いと格子が細かすぎて点が沈む。間引くと隊形だけが残る",
        squares: (n: number) => `${n}マス`,
      },
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
      description:
        "曲は入りません(音源はこの端末から出ないため)。取り込みは、いまの作品を上書きせず別の作品として作ります。",
      export: {
        label: "この作品を書き出す",
        description: "JSONで手元に保存します",
      },
      import: "ファイルから取り込む",
      reset: {
        label: "この作品を空にする",
        description: "シーンとダンサーを全部消します",
      },
    },

    account: {
      title: "アカウント",
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
