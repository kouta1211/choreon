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
    /** 畳んだ入口（ヘッダー右端） */
    menu: '表示とモード',
    menuView: '見え方',
    menuOpen: '開く',
    /** オンになっている見え方の数。畳むと状態が見えなくなるので、印で出す */
    menuBadge: (count: number) => `${count}`,
  },

  /** 初めて開いた人へ出す使い方の案内（EditorTour） */
  tour: {
    stageTitle: 'ここが舞台です',
    stageBody:
      '上がバックステージ、下が客席側。丸がダンサーで、掴んで動かせます。下の目盛りはセンターからの位置です。',
    timelineTitle: '横の位置が、曲の時間です',
    timelineBody:
      'コマは「曲の何秒目の隊形か」の位置に並びます。コマを横に引くとその時刻が動き、間隔がそのまま移動にかけられる時間になります。',
    dockTitle: 'シーンの帯です',
    dockBody:
      'コマを押すと、その隊形に切り替わります。左から順に本番の並びです。曲を入れると、この帯は「曲の何秒目か」で並ぶ時間軸に変わります。',
    addTitle: '隊形を足す',
    addBody:
      'いま聞いている位置に、いまの配置をコピーした隊形を作ります。作ってから動かす、が基本の流れです。',
    viewTitle: '見え方を変える',
    viewBody:
      '導線・格子・顔被りの警告などの切り替えと、見た目の変更はここです。この案内をもう一度見るのもここから。',
    back: '戻る',
    last: 'はじめる',
    nextWithProgress: (current: number, total: number) => `次へ（${current}/${total}）`,
    skip: 'とばす',
    /** 「表示とモード」に置く、もう一度見る入口 */
    replay: '使い方をもう一度見る',
  },

  /** 未ログインで開いたときに最初に出る、始め方を選ぶ画面 */
  welcome: {
    tagline: '振付の隊形を、時間と一緒に組む',
    guestStart: 'ゲストで始める',
    withTour: '使い方の案内から始める',
    guestNote: '登録は要りません。作ったものはこの端末にだけ残ります。',
    or: 'または',
    signIn: 'ログインして自分の作品を開く',
  },

  /** 画面が落ちたとき／知らない道を開いたとき */
  crash: {
    title: '画面が止まりました',
    safe: '作ったものは消えていません。下書きはこの端末に、ログインしている作品はサーバーに残っています。もう一度開けば戻ります。',
    retry: 'やり直す',
    detail: '報告するときは、この文をそのまま貼ってください',
  },
  notFound: {
    title: 'この画面はありません',
    body: 'リンクが古いか、打ち間違いかもしれません。配った人に確かめてください。',
    home: '最初の画面へ',
  },

  common: {
    on: 'オン',
    off: 'オフ',
    retry: '再試行',
    close: '閉じる',
    back: '戻る',
    done: '完了',
  },

  /** 作品そのものの出し入れ（一覧・新規作成・改名・削除・下書きの保存） */
  projects: {
    section: '作品',
    count: (n: number) => `${n}件`,
    newName: '新しい作品の名前',
    create: '作る',
    createFailed: '作品を作れませんでした',
    renamedForClash: (title: string) => `同じ名前があったので「${title}」で作りました`,
    rename: '名前を変える',
    renameFailed: '名前を変えられませんでした',
    remove: (title: string) => `${title} を消す`,
    deleteTitle: (title: string) => `「${title}」を消しますか`,
    deleteDescription: 'この作品のシーン・ダンサー・立ち位置がすべて消えます。',
    deleteFailed: '作品を消せませんでした',
    /** ゲストの下書き。作った時点の言語で名前が決まる */
    guestTitle: 'はじめてのフォーメーション',
    sceneName: (index: number) => `シーン${index}`,
    /** 下書きをクラウドへ */
    saveDraft: 'この下書きを自分の作品にする',
    saveDraftNote: 'ログインしている自分の作品として、新しく1件できます。',
    saveDraftFailed: '保存できませんでした',
    saved: (title: string) => `「${title}」として保存しました`,
    unsaved: 'まだ保存していない変更があります',
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
    rotate: '向きを変える',
    rotateValue: (degrees: number) => `${degrees}度`,
  },

  playback: {
    play: '▶ 通しで見る',
    stop: '■ 止める',
    rewind: '頭に戻す',
    /** 予備拍を数えている間。残りの拍を出す */
    countingIn: (beats: number) => `${beats}`,
    metronome: 'メトロノーム',
  },

  history: {
    undo: '↩ 元に戻す',
    redo: '↪ やり直す',
    undoFailed: '元に戻せませんでした。位置はそのままです',
    redoFailed: 'やり直せませんでした。位置はそのままです',
    targetGone: '戻す相手が見つかりません（消されたようです）',
  },

  music: {
    section: '曲',
    pick: '♪ 曲を選ぶ',
    clear: '外す',
    failed: '曲を読み込めませんでした',
    withMusic:
      '「通しで見る」を押すと、いま選んでいるシーンの秒から鳴ります。曲がある間は、時計は曲そのものです（ずれません）。',
    withoutMusic:
      '曲を入れると、通し再生の時計が曲になります。入れなくても秒だけで通せます。',
    kept: 'この端末に覚えます（作品ごとに1曲）。次に開いたときはそのまま鳴らせます。',
  },

  /**
   * 共有されたものを開く画面（読むだけ）。
   *
   * ■ 道順は「部品」で持ち、文はここで組む
   * 差分の読み取り（`describeMove`）は「左へ・前へ・6歩」までしか出さない。
   * 「下手前へ 約6歩」の語順は言語で変わり、**英語には「下手前」に当たる
   * 1語が無い**ため、繋ぎ方は辞書側の `direction()` が決める（Web版と同じ）。
   */
  viewer: {
    readOnly: '読むだけ',
    missing: 'この作品は開けませんでした',
    missingNote:
      'リンクが作り直されたか、共有が止められています。配った人に確かめてください。',
    back: '閉じる',

    move: {
      still: 'その場',
      to: (direction: string, steps: number) => `${direction}へ 約${steps}歩`,
      direction: (
        sideways: 'left' | 'right' | null,
        depth: 'front' | 'back' | null,
      ) =>
        `${sideways === null ? '' : sideways === 'left' ? '下手' : '上手'}${
          depth === null ? '' : depth === 'front' ? '前' : '奥'
        }`,
      turn: (facing: string) => `＋ ${facing}`,
    },
    facing: {
      0: '客席向き',
      45: '下手前向き',
      90: '下手向き',
      135: '下手奥向き',
      180: '奥向き',
      225: '上手奥向き',
      270: '上手向き',
      315: '上手前向き',
    },
    /** スクラブ帯（この画面の主操作） */
    scrub: {
      section: '時間',
      clock: (seconds: string, sceneName: string) =>
        sceneName ? `${seconds}s · ${sceneName}` : `${seconds}s`,
      tick: (seconds: number) => `${seconds}s`,
      note: '帯を横に引くと、移動の途中で止められます。コマを押すとその隊形へ。',
    },
    route: {
      title: (name: string) => `${name} の道順`,
      everyone: '全員',
      summary: (scenes: number, total: string) => `${scenes} シーン · 通し ${total}`,
      lastFormation: 'ここが最後の隊形です',
      stepsNote: '歩数は 1歩 60cm・1マス 90cm で計算した目安です。',
      sidesNote: '上手／下手は客席から見た向きです。',
      fast: ' — 速め',
      hereNow: ' · いまここ',
      reselect: 'ポジションを選び直す',
    },
    entry: {
      question: 'あなたはどれですか',
      note: '選ぶと、その人だけが濃く出て、道順も出るようになります。あとで変えられます。',
      skip: '選ばずに全員を見る',
    },
  },

  /** 曲に合わせる（速さ・拍子・曲の開始位置）。どれも【作品】が持つ値 */
  song: {
    description:
      'この作品が乗る曲の情報です。メトロノームと予備拍がここを見ます。設定の「既定の速さ」は、これから作る作品の初期値なので別のものです。',
    metronomeNote: '鳴らすかどうかはこの端末だけの好みで、作品には入りません',
    bpm: '速さ（BPM）',
    bpmUnit: 'BPM',
    bpmNote: '曲が無いときは、これが時間の物差しになります',
    presetLabel: (bpm: number) => `速さを ${bpm} にする`,
    beatsPerBar: '拍子',
    beatsOption: (beats: number) => `${beats}/4`,
    beatsNote:
      '数える単位（8カウント）は拍子では変わりません。ここで変わるのは、メトロノームで強く鳴る拍と、時間軸で太く引く線だけです。',
    offset: '曲の開始位置',
    seconds: '秒',
    offsetNote:
      '振付が曲の途中から始まるときに使います。イントロが12.5秒あるなら 12.5 と入れると、再生でそこから鳴ります。',
    bpmFailed: '速さを保存できませんでした。元に戻しました',
    beatsFailed: '拍子を保存できませんでした。元に戻しました',
    offsetFailed: '曲の開始位置を保存できませんでした。元に戻しました',
  },

  /** 時間軸（シーンを「曲の何秒目か」の位置に並べる帯） */
  /** 隊形の診断（Web版のルートへ頼む） */
  review: {
    title: '診断',
    summary: '隊形を見てもらう',
    description:
      'いま選んでいるシーンの立ち位置を見て、気になる点を挙げます。判定ではなく材料です — 振付の正解は1つではないので。',
    run: (sceneName: string) => `「${sceneName}」を見てもらう`,
    pickScene: 'シーンを1つ選んでください',
    onlyOnDevice:
      'これはスマホの実機からだけ頼めます。ブラウザで開いているときは、別の場所への呼び出しをブラウザが止めるためです（Web版の Choreon には同じ診断があります）。',
    failed: '診断できませんでした',
    offline: '届きませんでした。電波を確かめてください',
    note:
      '送るのは立ち位置の要約だけです（作品名・ダンサーの色・IDは送りません）。ログインが要ります。',
  },

  timeline: {
    minimap: '曲ぜんたいの見取り図',
    section: '時間軸',
    scale: (px: number) => `1秒 = ${px}px`,
    note:
      'コマを横に引くと、そのシーンの時刻が変わります。詰まっているところは番号だけの旗になります。曲の波形はまだ出せません。',
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
    order: '並び順',
    moveEarlier: '← 前へ',
    moveLater: '後ろへ →',
    orderNote:
      '隣のシーンと時刻を入れ替えます。曲全体の時間割は変わらず、そこへ入る隊形だけが入れ替わります。',
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
      focus: 'マイ・フォーカス',
      focusOn: 'マイ・フォーカス中',
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
    perProject: 'この作品だけ別のテーマにする',
    texture: '背景の質感',
    textureNote: '地の上に薄く重ねる模様です。ステージの中には掛かりません。',
    perProjectNote:
      'この作品を開いている間だけ、このテーマになります。ほかの作品と、作品を開いていないときは端末の既定のままです。',
  },

  /** 背景の質感の呼び名（Web版と同じ） */
  textures: {
    flat: 'フラット',
    horizon: 'ホリゾント幕',
    spot: 'スポットの円光',
    grid: '方眼と目盛り',
    nebula: 'ネビュラ',
    grain: 'グレイン',
    curtain: '暗幕',
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
        circle: '円（サークル）',
        none: 'なし',
      },
      centerLine: {
        label: 'センターライン',
        description: '中央の1本だけ色を変えて出す。隊形の基準になる線（目盛りを「なし」にしていると出ません）',
      },
      snap: {
        label: '格子に吸着させる',
        description: '切ると、どこにでも置けます',
      },
    },

    playback: {
      title: '再生',
      summary: '予備拍・既定の速さ・シーンを足す間隔',
      countIn: {
        label: '予備拍（カウントイン）',
        description: '再生を押してから、実際に動き出すまでに鳴らす拍',
        off: 'なし',
        beats: (n: number) => `${n}拍`,
      },
      bpm: {
        label: '既定の速さ',
        description: '新しく作る作品に入る速さ。開いている作品の速さは変わりません',
        unit: 'BPM',
      },
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
      summary: 'テーマ・言語・自動保存',
      scheme: {
        label: '見た目の明るさ',
        description: '10種のテーマから選ぶのは下のパレット。ここは暗いか明るいかだけを決めます',
        dark: '暗い',
        light: '明るい',
        system: '端末に合わせる',
      },
      autoSave: {
        label: '自動保存',
        description: '切ると、変更は「いま保存する」を押すまで送られません',
        pending: (count: number) => `送っていない変更が ${count} 件`,
        flush: 'いま保存する',
        failed: '保存できませんでした。もう一度お試しください',
        done: '保存しました',
      },
    },

    account: {
      title: 'アカウント',
      summary: 'ログイン・作品を開く・設定を戻す',
      resetSettings: {
        label: '設定を既定に戻す',
        description: 'この画面の選択だけを戻します。作品には触れません',
        title: '設定を既定に戻しますか',
        confirm: '戻す',
      },
    },
  },

  /** 作品の持ち出しと取り込み（JSON）。Web版 data と同じ文言 */
  data: {
    title: 'データ',
    summary: '書き出し・取り込み',
    description:
      '曲は入りません（音源はこの端末から出ないため）。取り込みは、いまの作品を上書きせず、別の作品として作ります。',
    export: '書き出す',
    exportNote: 'JSONで手元に保存します。表計算にも貼れて、中身を目で読めます。',
    exportFailed: '書き出せませんでした',
    exportedWeb: (name: string) => `${name} をダウンロードしました`,
    import: 'ファイルから取り込む',
    resetTitle: 'この作品を空にしますか',
    resetDescription:
      'シーンとダンサーを全部消します。作品そのもの（名前・ステージの広さ）は残ります。',
    resetMetaScenes: (n: number) => `${n} シーン`,
    resetMetaDancers: (n: number) => `${n} 人`,
    resetLabel: 'この作品を空にする',
    resetNote: '作り直したいときに。作品ごと消すのは 設定 → アカウント から。',
    resetConfirm: '空にする',
    resetFailed: '空にできませんでした',
    /** 動画の書き出しは Web版だけ。無いことと、その理由を書いておく */
    videoTitle: '動画の書き出しは、いまはブラウザで',
    videoNote:
      'この端末では作れません（画面を録る仕組みがアプリの中に無いためで、入れるとこのアプリ自体が Expo Go で動かなくなります）。同じ作品をブラウザの Choreon で開くと書き出せます。ログインしていれば、この端末で直したものはそのまま向こうにも出ています。',
    needsSignIn: 'ログインしてから取り込んでください',
    imported: (title: string) => `「${title}」として取り込みました`,
    importFailed: '取り込めませんでした',
    unreadableFile: 'ファイルを読み取れませんでした',
    wrongShape: 'ファイルの形が違います',
    wrongVersion: 'この形式は読み込めません（別の版で書き出されたファイルです）',
    noProject: '作品の情報が入っていません',
    incomplete: 'ダンサー・シーン・配置のどれかが足りません',
  },

  /** 共有（リンクを配って、稽古の相手に見てもらう） */
  share: {
    title: '共有',
    summary: 'リンクを配る・作り直す',
    description:
      'リンクを知っている人が、道順を見られるようになります。編集はできません。曲は入りません。',
    toggle: 'この作品を共有する',
    toggleNote: '切ると、配ったリンクはその場で開けなくなります。',
    link: 'リンク',
    send: 'リンクを渡す',
    rotate: 'リンクを作り直す',
    rotateNote: '作り直すと、前に配ったリンクは開けなくなります。',
    rotateTitle: 'リンクを作り直しますか',
    rotateDescription: '前に配ったリンクは、その瞬間から開けなくなります。',
    rotateConfirm: '作り直す',
    failed: '共有の設定を変えられませんでした',
    needsProject: '作品を開いてから共有してください',
    off: 'まだ共有していません',
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
