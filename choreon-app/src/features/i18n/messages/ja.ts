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

  common: {
    on: 'オン',
    off: 'オフ',
    retry: '再試行',
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
    removeConfirm: (name: string, dancers: number) =>
      `本当に「${name}」を消す（${dancers}人ぶんの立ち位置も消えます）`,
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
    removeConfirm: (name: string) => `本当に ${name} を消す`,
    hint: 'ステージか上の一覧で1人選ぶと、色を変えたり消したりできます',
    addFailed: 'ダンサーを追加できませんでした',
    removeFailed: 'この人を消せませんでした',
    colorFailed: '色を保存できませんでした。元に戻しました',
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

  settings: {
    section: '端末に覚える',
    loading: '（読み込み中）',
    audienceOnTop: '客席を上にする',
    dancerName: 'ダンサー名',
    dancerNameAlways: '常に',
    dancerNameNever: '出さない',
    grid: '目盛り',
    gridSquare: '格子',
    gridNone: 'なし',
    swipe: '払ってシーンを送る',
    path: '導線を出す',
    marks: 'バミリ（客席側の目盛り）',
    blindSpot: '顔被りを見つける',
    badgeNote:
      '丸の肩に付く印: 顔＝手前の人に隠れている／数字＝次のシーンへの移動が速すぎる（m/s。3.5 を超えると付く）。速さの印は常に出ます。',
    storageNote:
      '上2つは設定（settings）、目盛りは「表示とモード」（viewPreference）。どちらも Web は localStorage、iOS/Android は AsyncStorage へ書いています。',
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
