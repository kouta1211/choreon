/**
 * ネイティブ版の言葉（日本語）。**これが型の元**で、en / ko はこの形に
 * 合わせる（キーの足し忘れがコンパイルで止まる）。
 *
 * ■ Web版の辞書を丸ごと持ってこない理由
 * あちらは750行あり、その大半がネイティブ版にまだ無い画面のもの。
 * 使わないキーを並べても、どれが生きているのか分からなくなる。
 * **同じ意味のものは Web版と同じ文言**にしてある（テーマ名・隊形名・
 * ログインの失敗文など）ので、画面を移すときに突き合わせられる。
 *
 * ■ 隊形名は形と内訳に分けて持つ
 * 59個の名前を並べる代わりに、形（shape）と人数の内訳（rows）で作る。
 * 「V字」と「2列」がどの人数でも同じ言葉で出る（Web版と同じ作り）。
 */
export const ja = {
  app: {
    title: 'Choreon',
    subtitle: 'ネイティブ版の土台',
  },

  /** エディタの骨格（ヘッダーと、そこから開くシート） */
  editor: {
    /** 作品を開いていないとき、ヘッダーに出す名前 */
    draft: 'ネイティブ版の下書き',
    dancers: 'ダンサー',
    formations: '隊形',
    music: '曲',
    editScene: 'シーンを直す',
  },

  common: {
    on: 'オン',
    off: 'オフ',
    retry: '再試行',
    close: '閉じる',
    back: '戻る',
    done: '完了',
  },

  /** 取り消せない操作の前に出す確認。Web版と同じ文言 */
  confirm: {
    cancel: 'やめる',
    delete: '削除する',
    deleting: '削除中…',
    cannotUndo: 'この操作は元に戻せません。',
    undoNote: '（移動や向きの変更は「元に戻す」で戻せます）',
  },

  stage: {
    backstage: 'バックステージ',
    audience: '客席側',
    /** 丸の肩に付く印。「顔」は顔被り */
    blockedBadge: '顔',
  },

  playback: {
    play: '▶ 通しで見る',
    stop: '■ 止める',
    rewind: '頭に戻す',
  },

  history: {
    undo: '↩ 元に戻す',
    redo: '↪ やり直す',
  },

  music: {
    section: '曲',
    pick: '♪ 曲を選ぶ',
    clear: '外す',
    failed: '曲を読み込めませんでした',
    withMusic:
      '「通しで見る」を押すと、いま選んでいるシーンの秒から鳴ります。曲がある間は、時計は曲そのものです（ずれません）。',
    withoutMusic:
      '曲を入れると、通し再生の時計が曲になります。入れなくても秒だけで通せます。アプリを開き直すと選び直しです。',
  },

  scenes: {
    section: 'シーン',
    add: 'シーンを足す',
    newName: (index: number) => `シーン${index}`,
    editTitle: (number: string) => `シーン ${number} を直す`,
    nameLabel: 'シーンの名前',
    pickOne: 'シーンを1つ選ぶと、ここで直せます',
    firstNote: (seconds: string) =>
      `先頭のシーンには「入ってくる時間」がありません（前の隊形が無いため）。曲の何秒目かは ${seconds} 秒です。`,
    segment: '前の隊形から入ってくる時間',
    shorter: '入ってくる時間を短く',
    longer: '入ってくる時間を長く',
    ripple: '以降のシーンもずらす',
    rippleNote: (seconds: string) =>
      `オフのときは次のシーンを押しのけず、手前の余地いっぱいで止まります。曲の ${seconds} 秒目。`,
    remove: 'このシーンを消す',
    removeTitle: (name: string) => `「${name}」を消しますか`,
    removeDescription: 'このシーンと、そこに置いた立ち位置がまとめて消えます。',
    removeMetaPositions: (count: number) => `${count} 人ぶんの立ち位置`,
    addFailed: 'シーンを追加できませんでした',
    removeFailed: 'シーンを消せませんでした',
    renameFailed: '名前を保存できませんでした。元に戻しました',
    retimeFailed: '秒数を保存できませんでした。元に戻しました',
  },

  dancers: {
    section: (count: number) => `ダンサー（${count}人）`,
    add: '＋ 追加',
    addLabel: 'ダンサーを追加',
    selected: '選んでいるのは',
    colorLabel: (color: string) => `色を ${color} にする`,
    remove: 'この人を消す',
    removeTitle: (name: string) => `${name} を消しますか`,
    removeDescription: 'この人が、すべてのシーンから居なくなります。',
    removeMetaScenes: (count: number) => `${count} シーンぶんの立ち位置`,
    hint: 'ステージか上の一覧で1人選ぶと、色を変えたり消したりできます',
    addFailed: 'ダンサーを追加できませんでした',
    removeFailed: 'この人を消せませんでした',
    colorFailed: '色を保存できませんでした。元に戻しました',

    /** ステージの直上に出る帯（選んでいる人の操作） */
    inspector: {
      name: '名前',
      nameFailed: '名前を保存できませんでした。元に戻しました',
      focus: 'この人に注目',
      focusOn: '注目中',
      deselect: '選択をやめる',
      ownDuration: 'この人だけの移動時間',
      ownDurationFailed: '移動時間を保存できませんでした。元に戻しました',
      seconds: '秒',
      /** 空欄のときに薄く出す値＝シーンの区間の長さ */
      inherit: (seconds: string) => `${seconds}`,
    },
  },

  formations: {
    section: '隊形',
    count: (n: number) => `（${n}種）`,
    needsTwo: '隊形を選ぶには、このシーンに2人以上立っている必要があります。',
    noneForCount: (n: number) =>
      `${n}人ぶんの形はまだ用意していません（2〜10人ぶんがあります）。`,
    flipX: '左右反転',
    flipY: '前後反転',
    rotate: '90度回す',
    spacing: '間隔',
    spacingNarrow: '狭め',
    spacingNormal: 'ふつう',
    spacingWide: '広め',
    hint: 'いまの位置からいちばん近い点へ入ります。戻すときは「元に戻す」で一度に戻せます',
    applied: (name: string) => `${name} にしました`,
    appliedPartial: (name: string, left: number) =>
      `${name} にしました（余る${left}人はそのまま）`,
    failed: '隊形を保存できませんでした。元に戻しました',
  },

  positions: {
    saveFailed: '保存できませんでした。位置を元に戻しました',
  },

  account: {
    section: 'アカウント',
    checking: '（確かめています）',
    email: 'メールアドレス',
    password: 'パスワード',
    signIn: 'ログイン',
    signUp: '新規登録',
    signOut: 'ログアウト',
    wrongCredentials: 'メールアドレスまたはパスワードが正しくありません',
    alreadyRegistered: 'このメールアドレスはすでに登録されています',
    signUpFailed: '登録できませんでした',
    confirmSent:
      '確認のメールを送りました。メールのリンクを開いてから、ログインしてください',
    note: 'Web版と同じアカウントです。ここで開いた作品はこの端末からも保存されます。実機での確認はこれからなので、まずは捨ててよい作品で試してください。',
    open: '開く',
    empty: 'まだ作品がありません',
    listFailed: '作品の一覧を読めませんでした（通信か権限の問題です）',
    notFound: 'その作品は見つかりませんでした',
    openFailed: '作品を読めませんでした',
    opened: (title: string) => `「${title}」を開いています（この端末での変更も保存されます）`,
  },

  themeSection: {
    title: 'テーマ',
    loading: '（読み込み中）',
    note: '色は Web版の themes.css から機械的に写しています。選んだテーマは端末に残ります。',
  },

  themes: {
    midnight: 'ミッドナイト・ピンク',
    neon: 'ネオン・シアン',
    amber: 'アンバー・ステージ',
    mono: 'モノクローム',
    chalk: '黒板＋チョーク',
    paper: '紙の隊形図',
    gridnote: '方眼ノート＋青インク',
    kraft: 'クラフト紙＋活版',
    tracing: 'トレーシングペーパー',
    whiteboard: 'ホワイトボード＋マーカー',
  },

  /**
   * 設定シート。**Web版と同じ入れ子の形**にしてある（束ごとに1画面）。
   *
   * ネイティブ版にまだ無い機能の行は置いていない — カウントイン・自動保存・
   * センターライン・新しい作品の広さ。押しても何も起きない設定を並べると、
   * 「動かない」という報告になって返ってくる。実装したときにここへ足す。
   */
  settings: {
    title: '設定',
    loading: '（読み込み中）',
    storageNote:
      'ここでの選択はこの端末だけに残ります（Web は localStorage、iOS/Android は AsyncStorage）。作品そのものには入りません。',

    stage: {
      title: '舞台',
      summary: '客席の向き',
      description:
        '向きを変えても、保存されている立ち位置は動きません。描く向きと、道順の言葉づかいだけが入れ替わります。',
      audienceOnTop: {
        label: '客席を上にする',
        description: '既定は上がバックステージ。稽古場で鏡を見ながら組むときに入れ替える',
      },
    },

    grid: {
      title: '目盛り',
      summary: '格子の出し方・吸着',
      mode: {
        label: '格子',
        square: '格子',
        none: 'なし',
      },
      snap: {
        label: '格子に吸着させる',
        description: '切ると、どこにでも置けます',
      },
    },

    playback: {
      title: '再生',
      summary: 'シーンを足す間隔',
      segment: {
        label: 'シーンの間隔',
        description:
          'シーンを足したとき、いまの位置から何秒後に置くか。120BPMなら4秒が1つの8カウント',
        unit: '秒',
      },
    },

    display: {
      title: '表示',
      summary: 'ダンサー名・導線・バミリ・顔被り・払って送る',
      description:
        '丸の肩に付く印: 顔＝手前の人に隠れている／数字＝次のシーンへの移動が速すぎる（m/s。3.5 を超えると付く）。速さの印は常に出ます。',
      dancerName: {
        label: 'ダンサー名',
        description: '人数が多いと名前で埋まる。選択時だけにすると隊形が読みやすい',
        always: '常に',
        selected: '選択時',
        never: '出さない',
      },
      path: {
        label: '導線',
        description: '次のシーンへの動きを線で描きます',
      },
      stageMarks: {
        label: 'バミリ',
        description: '客席側の床に、中央からの目盛りを並べます',
      },
      blindSpot: {
        label: '顔被りチェック',
        description: '手前の人の真後ろに入って、客席から見えない人に印を付けます',
      },
      swipe: {
        label: '払ってシーンを送る',
        description: 'ステージを横になぞると、前後のシーンへ移ります',
      },
    },

    app: {
      title: 'アプリ',
      summary: 'テーマ・言語',
    },

    account: {
      title: 'アカウント',
      summary: 'ログイン・作品を開く',
    },
  },

  language: {
    section: '言語',
    note: '選んだ言語は端末に残ります。',
  },

  supabase: {
    section: 'Supabase',
    checking: '確かめています…',
    reached: '届いた',
    failed: (status: number) => `届かない（${status}）`,
    offline: '届かない（通信できませんでした）',
    signedIn: 'ログイン中',
    signedOut: '未ログイン',
    platform: '環境',
  },

  /** 隊形の呼び名。形と人数の内訳から作る（Web版 ja.ts と同じ文言） */
  formationNames: {
    row: '横1列',
    rowPair: '横並び',
    rowFront: '前寄せ横並び',
    rowBack: '奥寄せ横並び',
    column: '縦1列',
    columnPair: '縦1列（前後）',
    diagonal: '斜め',
    diagonalLine: '斜め列',
    lShape: 'L字',
    xShape: 'X字',
    wShape: 'W字（ジグザグ）',
    diamond: 'ダイヤ',
    circle: '円（サークル）',
    circleCenter: '円＋センター',
    arc: '弧（アーチ）',
    wedgeIn: 'ハの字（後狭・前広）',
    wedgeOut: 'くさび（後広・前狭）',
    triangle: (rows: number[]) => `三角（後${rows[0]}・前${rows[1]}）`,
    triangleDown: (rows: number[]) => `逆三角（後${rows[0]}・前${rows[1]}）`,
    v: (rows: number[]) => `V字（後${rows.join('-')}前）`,
    vDown: (rows: number[]) => `逆V字（後${rows.join('-')}前）`,
    twoRows: (rows: number[]) => `2列（${rows.join('-')}）`,
    twoColumns: (rows: number[]) => `縦2列（${rows.join('-')}）`,
    stagger: (rows: number[]) => `千鳥（${rows.join('-')}）`,
    arcRows: (rows: number[]) => `弧2列（${rows.join('-')}）`,
    grid: (rows: number[]) => `${rows[0]}×${rows[1]} グリッド`,
  },
};

export type Messages = typeof ja;
