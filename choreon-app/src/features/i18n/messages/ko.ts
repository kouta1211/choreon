import type { Messages } from './ja';

/**
 * 한국어. `ja.ts` と同じ形（あちらが型の元なので、キーの足し忘れは
 * コンパイルで止まる）。Web版に同じものがある語（テーマ名・隊形名・
 * ログインの失敗文）は、そちらの文言に合わせてある。
 */
export const ko: Messages = {
  app: {
    title: 'Choreon',
    subtitle: '네이티브 버전',
  },

  editor: {
    draft: '네이티브 초안',
    dancers: '댄서',
    formations: '대형',
    music: '곡',
    editScene: '장면 수정',
    menu: '표시와 모드',
    menuView: '보기',
    menuOpen: '열기',
    menuBadge: (count: number) => `${count}`,
  },

  tour: {
    stageTitle: '여기가 무대입니다',
    stageBody:
      '위가 무대 뒤, 아래가 객석 쪽입니다. 동그라미가 댄서이고, 잡아서 옮길 수 있습니다. 아래 눈금은 센터에서의 거리입니다.',
    timelineTitle: '가로 위치가 곡의 시간입니다',
    timelineBody:
      "각 컷은 '곡의 몇 초의 대형인지'의 위치에 놓입니다. 컷을 옆으로 끌면 그 시각이 움직이고, 간격이 그대로 이동에 쓸 수 있는 시간이 됩니다.",
    dockTitle: '장면 띠입니다',
    dockBody:
      "컷을 누르면 그 대형으로 바뀝니다. 왼쪽부터 순서대로 공연 순서입니다. 곡을 넣으면 이 띠는 '곡의 몇 초인지'로 놓이는 시간축으로 바뀝니다.",
    addTitle: '대형 추가하기',
    addBody:
      '지금 듣고 있는 위치에, 지금 배치를 복사한 대형을 만듭니다. 만들고 나서 옮기는 것이 기본 흐름입니다.',
    viewTitle: '보이는 방식 바꾸기',
    viewBody:
      '동선·격자·가림 경고 같은 전환과 화면 모양 변경이 여기 있습니다. 이 안내를 다시 보는 것도 여기서 할 수 있습니다.',
    back: '뒤로',
    last: '시작하기',
    nextWithProgress: (current: number, total: number) => `다음 (${current}/${total})`,
    skip: '건너뛰기',
    replay: '사용법 다시 보기',
  },

  welcome: {
    tagline: '안무 대형을 시간과 함께 짜기',
    guestStart: '게스트로 시작하기',
    withTour: '사용법 안내부터 시작',
    guestNote: '가입은 필요 없습니다. 만든 것은 이 기기에만 남습니다.',
    or: '또는',
    signIn: '로그인해서 내 작품 열기',
  },

  crash: {
    title: '화면이 멈췄습니다',
    safe: '만든 것은 사라지지 않았습니다. 초안은 이 기기에, 로그인한 작품은 서버에 남아 있습니다. 다시 열면 돌아옵니다.',
    retry: '다시 시도',
    detail: '알려 주실 때는 아래 문장을 그대로 붙여 주세요',
  },
  notFound: {
    title: '그런 화면은 없습니다',
    body: '링크가 오래되었거나 잘못 입력되었을 수 있습니다. 보낸 사람에게 확인해 주세요.',
    home: '처음 화면으로',
  },

  common: {
    on: '켬',
    off: '끔',
    retry: '다시 시도',
    close: '닫기',
    back: '뒤로',
    done: '완료',
  },

  projects: {
    section: '작품',
    count: (n: number) => `${n}건`,
    newName: '새 작품 이름',
    create: '만들기',
    createFailed: '작품을 만들지 못했습니다',
    renamedForClash: (title: string) => `같은 이름이 있어서 「${title}」(으)로 만들었습니다`,
    rename: '이름 변경',
    renameFailed: '이름을 바꾸지 못했습니다',
    remove: (title: string) => `${title} 삭제`,
    deleteTitle: (title: string) => `「${title}」을(를) 삭제할까요`,
    deleteDescription: '이 작품의 장면·댄서·위치가 모두 사라집니다.',
    deleteFailed: '작품을 삭제하지 못했습니다',
    guestTitle: '첫 포메이션',
    sceneName: (index: number) => `장면${index}`,
    saveDraft: '이 초안을 내 작품으로 저장',
    saveDraftNote: '로그인한 계정의 작품으로 새로 하나 만들어집니다.',
    saveDraftFailed: '저장하지 못했습니다',
    saved: (title: string) => `「${title}」(으)로 저장했습니다`,
    unsaved: '아직 저장하지 않은 변경이 있습니다',
  },

  confirm: {
    cancel: '취소',
    delete: '삭제',
    deleting: '삭제 중…',
    cannotUndo: '이 작업은 되돌릴 수 없습니다.',
    undoNote: '(이동과 방향 변경은 「되돌리기」로 되돌릴 수 있습니다.)',
  },

  stage: {
    backstage: '무대 뒤',
    audience: '객석 쪽',
    blockedBadge: '얼굴',
    rotate: '방향 바꾸기',
    rotateValue: (degrees: number) => `${degrees}도`,
  },

  playback: {
    play: '▶ 전체 보기',
    stop: '■ 정지',
    rewind: '처음으로',
    countingIn: (beats: number) => `${beats}`,
    metronome: '메트로놈',
  },

  history: {
    undo: '↩ 되돌리기',
    redo: '↪ 다시 실행',
    undoFailed: '되돌리지 못했습니다. 위치는 그대로입니다',
    redoFailed: '다시 실행하지 못했습니다. 위치는 그대로입니다',
    targetGone: '되돌릴 대상을 찾을 수 없습니다(삭제된 것 같습니다)',
  },

  music: {
    section: '음악',
    pick: '♪ 곡 선택',
    clear: '해제',
    failed: '곡을 불러오지 못했습니다',
    withMusic:
      '「전체 보기」를 누르면 지금 선택한 장면의 초부터 재생됩니다. 곡이 있는 동안에는 곡 자체가 시계입니다(어긋나지 않습니다).',
    withoutMusic:
      '곡을 넣으면 전체 재생의 시계가 곡이 됩니다. 넣지 않아도 초만으로 재생됩니다.',
    kept: '이 기기에 저장합니다(작품당 1곡). 다음에 열어도 그대로 재생할 수 있습니다.',
  },

  viewer: {
    readOnly: '보기 전용',
    missing: '이 작품을 열 수 없었습니다',
    missingNote: '링크가 새로 만들어졌거나 공유가 중지되었습니다. 보낸 사람에게 확인해 주세요.',
    back: '닫기',

    move: {
      still: '제자리',
      to: (direction: string, steps: number) => `${direction}으로 약 ${steps}걸음`,
      direction: (
        sideways: 'left' | 'right' | null,
        depth: 'front' | 'back' | null,
      ) =>
        `${sideways === null ? '' : sideways === 'left' ? '하수' : '상수'}${
          depth === null ? '' : depth === 'front' ? '앞' : '뒤'
        }`,
      turn: (facing: string) => `＋ ${facing}`,
    },
    facing: {
      0: '객석 방향',
      45: '하수 앞 방향',
      90: '하수 방향',
      135: '하수 뒤 방향',
      180: '뒤 방향',
      225: '상수 뒤 방향',
      270: '상수 방향',
      315: '상수 앞 방향',
    },
    scrub: {
      section: '시간',
      clock: (seconds: string, sceneName: string) =>
        sceneName ? `${seconds}s · ${sceneName}` : `${seconds}s`,
      tick: (seconds: number) => `${seconds}s`,
      note: '띠를 옆으로 끌면 이동 도중에 멈출 수 있습니다. 컷을 누르면 그 대형으로.',
    },
    route: {
      title: (name: string) => `${name}의 동선`,
      everyone: '전체',
      summary: (scenes: number, total: string) => `${scenes}개 장면 · 전체 ${total}`,
      lastFormation: '여기가 마지막 대형입니다',
      stepsNote: '걸음 수는 1걸음 60cm·1칸 90cm로 계산한 기준입니다.',
      sidesNote: '상수／하수는 객석에서 본 방향입니다.',
      fast: ' — 빠름',
      hereNow: ' · 지금 여기',
      reselect: '포지션 다시 고르기',
    },
    entry: {
      question: '어느 분인가요',
      note: '고르면 그 사람만 진하게 보이고 동선도 표시됩니다. 나중에 바꿀 수 있습니다.',
      skip: '고르지 않고 전체 보기',
    },
  },

  song: {
    description:
      "이 작품이 올라가는 곡의 정보입니다. 메트로놈과 예비 박자가 여기를 봅니다. 설정의 '기본 빠르기'는 앞으로 만들 작품의 초기값이라 다른 것입니다.",
    metronomeNote: '소리를 낼지는 이 기기만의 취향이고, 작품에는 들어가지 않습니다',
    bpm: '속도(BPM)',
    bpmUnit: 'BPM',
    bpmNote: '곡이 없을 때는 이것이 시간의 잣대가 됩니다',
    presetLabel: (bpm: number) => `빠르기를 ${bpm}으로`,
    beatsPerBar: '박자',
    beatsOption: (beats: number) => `${beats}/4`,
    beatsNote:
      '세는 단위(8카운트)는 박자로 바뀌지 않습니다. 여기서 바뀌는 것은 메트로놈에서 세게 울리는 박과, 시간축에 굵게 긋는 선뿐입니다.',
    offset: '곡의 시작 위치',
    seconds: '초',
    offsetNote:
      '안무가 곡 중간부터 시작할 때 씁니다. 인트로가 12.5초라면 12.5를 넣으면 재생이 거기서 시작합니다.',
    bpmFailed: '빠르기를 저장하지 못했습니다. 되돌렸습니다',
    beatsFailed: '박자를 저장하지 못했습니다. 되돌렸습니다',
    offsetFailed: '곡의 시작 위치를 저장하지 못했습니다. 되돌렸습니다',
  },

  review: {
    title: '진단',
    summary: '대형을 봐 달라고 하기',
    description:
      '지금 선택한 장면의 위치를 보고 눈에 띄는 점을 짚어 줍니다. 판정이 아니라 재료입니다 — 안무에 정답은 하나가 아니므로.',
    run: (sceneName: string) => `「${sceneName}」 봐 달라고 하기`,
    pickScene: '장면을 하나 선택하세요',
    onlyOnDevice:
      '이것은 휴대폰 실기기에서만 요청할 수 있습니다. 브라우저에서는 다른 곳으로의 호출을 브라우저가 막기 때문입니다(브라우저의 Choreon에도 같은 진단이 있습니다).',
    failed: '진단하지 못했습니다',
    offline: '서버에 닿지 못했습니다. 연결을 확인하세요',
    note:
      '보내는 것은 위치 요약뿐입니다(작품 이름·댄서 색·ID는 보내지 않습니다). 로그인이 필요합니다.',
  },

  timeline: {
    minimap: '곡 전체 개요',
    section: '타임라인',
    scale: (px: number) => `1초 = ${px}px`,
    note:
      '카드를 옆으로 끌면 그 장면의 시각이 바뀝니다. 촘촘한 곳은 번호만 표시됩니다. 곡의 파형은 아직 표시할 수 없습니다.',
  },

  scenes: {
    section: '장면',
    add: '장면 추가',
    newName: (index: number) => `장면${index}`,
    editTitle: (number: string) => `장면 ${number} 수정`,
    nameLabel: '장면 이름',
    pickOne: '장면을 하나 선택하면 여기서 수정할 수 있습니다',
    firstNote: (seconds: string) =>
      `첫 장면에는 「들어오는 시간」이 없습니다(앞 대형이 없기 때문). 곡의 ${seconds}초 지점입니다.`,
    segment: '앞 대형에서 들어오는 시간',
    shorter: '들어오는 시간 줄이기',
    longer: '들어오는 시간 늘리기',
    ripple: '이후 장면도 함께 밀기',
    rippleNote: (seconds: string) =>
      `끄면 다음 장면을 밀지 않고 바로 앞에서 멈춥니다. 곡의 ${seconds}초 지점.`,
    order: '순서',
    moveEarlier: '← 앞으로',
    moveLater: '뒤로 →',
    orderNote:
      '옆 장면과 시각을 맞바꿉니다. 곡 전체의 시간 배치는 그대로이고, 거기에 들어가는 대형만 바뀝니다.',
    remove: '이 장면 삭제',
    removeTitle: (name: string) => `「${name}」을(를) 삭제할까요`,
    removeDescription: '이 장면과 거기에 놓은 위치가 함께 사라집니다.',
    removeMetaPositions: (count: number) => `${count}명의 위치`,
    addFailed: '장면을 추가하지 못했습니다',
    removeFailed: '장면을 삭제하지 못했습니다',
    renameFailed: '이름을 저장하지 못해 되돌렸습니다',
    retimeFailed: '초를 저장하지 못해 되돌렸습니다',
  },

  dancers: {
    section: (count: number) => `댄서(${count}명)`,
    add: '＋ 추가',
    addLabel: '댄서 추가',
    selected: '선택한 사람:',
    colorLabel: (color: string) => `색을 ${color}(으)로`,
    remove: '이 사람 삭제',
    removeTitle: (name: string) => `${name}을(를) 삭제할까요`,
    removeDescription: '이 사람이 모든 장면에서 사라집니다.',
    removeMetaScenes: (count: number) => `${count}개 장면의 위치`,
    hint: '무대나 위 목록에서 한 명을 고르면 색을 바꾸거나 삭제할 수 있습니다',
    addFailed: '댄서를 추가하지 못했습니다',
    removeFailed: '이 사람을 삭제하지 못했습니다',
    colorFailed: '색을 저장하지 못해 되돌렸습니다',

    inspector: {
      name: '이름',
      nameFailed: '이름을 저장하지 못해 되돌렸습니다',
      focus: '마이 포커스',
      focusOn: '마이 포커스 중',
      deselect: '선택 해제',
      ownDuration: '이 사람만의 이동 시간',
      ownDurationFailed: '이동 시간을 저장하지 못해 되돌렸습니다',
      seconds: '초',
      inherit: (seconds: string) => `${seconds}`,
    },
  },

  formations: {
    section: '대형',
    count: (n: number) => `(${n}종)`,
    needsTwo: '대형을 고르려면 이 장면에 두 명 이상 있어야 합니다.',
    noneForCount: (n: number) =>
      `${n}명용 대형은 아직 없습니다(2~10명용이 있습니다).`,
    flipX: '좌우 반전',
    flipY: '앞뒤 반전',
    rotate: '90도 회전',
    spacing: '간격',
    spacingNarrow: '좁게',
    spacingNormal: '보통',
    spacingWide: '넓게',
    hint: '지금 위치에서 가장 가까운 자리로 들어갑니다. 「되돌리기」로 한 번에 되돌릴 수 있습니다',
    applied: (name: string) => `${name}(으)로 바꿨습니다`,
    appliedPartial: (name: string, left: number) =>
      `${name}(으)로 바꿨습니다(남는 ${left}명은 그대로)`,
    failed: '대형을 저장하지 못해 되돌렸습니다',
  },

  positions: {
    saveFailed: '저장하지 못해 위치를 되돌렸습니다',
  },

  account: {
    section: '계정',
    checking: '(확인 중)',
    email: '이메일',
    password: '비밀번호',
    signIn: '로그인',
    signUp: '회원가입',
    signOut: '로그아웃',
    wrongCredentials: '이메일 또는 비밀번호가 올바르지 않습니다',
    alreadyRegistered: '이미 가입된 이메일입니다',
    signUpFailed: '가입하지 못했습니다',
    confirmSent: '확인 메일을 보냈습니다. 메일의 링크를 연 뒤 로그인하세요',
    note: '웹 버전과 같은 계정입니다. 여기서 연 작품은 이 기기에서도 저장됩니다. 실제 기기 확인은 아직이므로, 없어져도 괜찮은 작품으로 먼저 시험해 보세요.',
    open: '열기',
    empty: '아직 작품이 없습니다',
    listFailed: '작품 목록을 불러오지 못했습니다(통신 또는 권한 문제)',
    notFound: '그 작품을 찾을 수 없습니다',
    openFailed: '작품을 열지 못했습니다',
    opened: (title: string) => `「${title}」을(를) 열었습니다(이 기기의 변경도 저장됩니다)`,
  },

  themeSection: {
    title: '테마',
    loading: '(불러오는 중)',
    note: '색은 웹 버전의 themes.css에서 그대로 옮겼습니다. 고른 테마는 기기에 남습니다.',
    perProject: '이 작품만 다른 테마로',
    texture: '배경 질감',
    textureNote: '바탕 위에 옅게 겹치는 무늬입니다. 무대 안에는 적용되지 않습니다.',
    perProjectNote:
      '이 작품을 열고 있는 동안에만 이 테마가 적용됩니다. 다른 작품은 기기 기본값 그대로입니다.',
  },

  textures: {
    flat: '단색',
    horizon: '호리존트',
    spot: '스포트라이트',
    grid: '모눈과 눈금',
    nebula: '네뷸라',
    grain: '그레인',
    curtain: '암막',
  },

  themes: {
    midnight: '미드나이트 핑크',
    neon: '네온 시안',
    amber: '앰버 스테이지',
    mono: '모노크롬',
    chalk: '칠판＋분필',
    paper: '종이 대형도',
    gridnote: '모눈 노트＋파란 잉크',
    kraft: '크라프트지＋활판',
    tracing: '트레이싱지',
    whiteboard: '화이트보드＋마커',
  },

  settings: {
    title: '설정',
    loading: '(불러오는 중)',
    storageNote:
      '여기서 고른 것은 이 기기에만 남습니다(웹은 localStorage, iOS/Android는 AsyncStorage). 작품 자체에는 들어가지 않습니다.',

    stage: {
      title: '무대',
      summary: '객석 방향',
      description:
        '방향을 바꿔도 저장된 위치는 움직이지 않습니다. 그리는 방향과 앞뒤를 가리키는 말만 바뀝니다.',
      audienceOnTop: {
        label: '객석을 위로',
        description: '기본은 위가 백스테이지. 거울을 보며 짤 때 바꿔 쓰세요',
      },
    },

    grid: {
      title: '눈금',
      summary: '격자 표시·자석',
      mode: {
        label: '격자',
        square: '격자',
        circle: '원',
        none: '없음',
      },
      centerLine: {
        label: '센터 라인',
        description:
          "가운데 한 줄만 색을 바꿔 표시합니다. 대형의 기준이 되는 선입니다(눈금을 '없음'으로 하면 표시되지 않습니다)",
      },
      snap: {
        label: '격자에 붙이기',
        description: '끄면 어디에나 놓을 수 있습니다',
      },
    },

    playback: {
      title: '재생',
      summary: '예비 박·기본 빠르기·장면 추가 간격',
      countIn: {
        label: '예비 박(카운트인)',
        description: '재생을 누른 뒤 실제로 움직이기 시작할 때까지 울리는 박',
        off: '없음',
        beats: (n: number) => `${n}박`,
      },
      bpm: {
        label: '기본 빠르기',
        description: '새로 만드는 작품에 들어갑니다. 열려 있는 작품의 빠르기는 바뀌지 않습니다',
        unit: 'BPM',
      },
      segment: {
        label: '장면 간격',
        description:
          '장면을 추가할 때 현재 위치에서 몇 초 뒤에 놓을지. 120BPM이면 4초가 8카운트 하나',
        unit: '초',
      },
    },

    display: {
      title: '표시',
      summary: '댄서 이름·동선·바미리·얼굴 가림·밀어서 넘기기',
      description:
        '동그라미 어깨의 표시: 얼굴＝앞사람에게 가려짐 / 숫자＝다음 장면으로의 이동이 너무 빠름(m/s, 3.5 초과 시 표시). 속도 표시는 항상 나옵니다.',
      dancerName: {
        label: '댄서 이름',
        description: '인원이 많으면 이름으로 가득 찹니다. 선택한 사람만 보이면 대형이 읽기 쉬워요',
        always: '항상',
        selected: '선택 시',
        never: '표시 안 함',
      },
      path: {
        label: '동선',
        description: '다음 장면으로의 움직임을 선으로 그립니다',
      },
      stageMarks: {
        label: '바미리',
        description: '객석 쪽 바닥에 중앙에서부터의 눈금을 놓습니다',
      },
      blindSpot: {
        label: '얼굴 가림 확인',
        description: '앞사람 바로 뒤에 들어가 객석에서 보이지 않는 사람을 표시합니다',
      },
      swipe: {
        label: '밀어서 장면 넘기기',
        description: '무대를 옆으로 쓸면 앞뒤 장면으로 이동합니다',
      },
    },

    app: {
      title: '앱',
      summary: '테마·언어·자동 저장',
      scheme: {
        label: '화면 밝기',
        description: '10가지 테마는 아래 팔레트에서 고릅니다. 여기서는 어두운지 밝은지만 정합니다',
        dark: '어둡게',
        light: '밝게',
        system: '기기에 맞춤',
      },
      autoSave: {
        label: '자동 저장',
        description: '끄면 「지금 저장」을 누를 때까지 보내지 않습니다',
        pending: (count: number) => `보내지 않은 변경 ${count}건`,
        flush: '지금 저장',
        failed: '저장하지 못했습니다. 다시 시도해 주세요',
        done: '저장했습니다',
      },
    },

    account: {
      title: '계정',
      summary: '로그인·작품 열기·설정 되돌리기',
      resetSettings: {
        label: '설정을 기본값으로',
        description: '이 화면의 선택만 되돌립니다. 작품은 건드리지 않습니다',
        title: '설정을 기본값으로 되돌릴까요',
        confirm: '되돌리기',
      },
    },
  },

  data: {
    title: '데이터',
    summary: '내보내기·가져오기',
    description:
      '곡은 들어가지 않습니다(음원은 이 기기에서 나가지 않습니다). 가져오기는 현재 작품을 덮어쓰지 않고 다른 작품으로 만듭니다.',
    export: '내보내기',
    exportNote: 'JSON으로 저장합니다. 스프레드시트에도 붙일 수 있고 눈으로 읽을 수 있습니다.',
    exportFailed: '내보내지 못했습니다',
    exportedWeb: (name: string) => `${name}을(를) 내려받았습니다`,
    import: '파일에서 가져오기',
    resetTitle: '이 작품을 비울까요',
    resetDescription: '장면과 댄서를 모두 삭제합니다. 작품 자체(이름·무대 크기)는 남습니다.',
    resetMetaScenes: (n: number) => `${n}개 장면`,
    resetMetaDancers: (n: number) => `${n}명`,
    resetLabel: '이 작품 비우기',
    resetNote: '다시 짜고 싶을 때. 작품 자체를 지우려면 설정 → 계정에서.',
    resetConfirm: '비우기',
    resetFailed: '비우지 못했습니다',
    videoTitle: '동영상 내보내기는 지금은 브라우저에서',
    videoNote:
      '이 기기에서는 만들 수 없습니다(화면을 녹화하는 장치가 앱 안에 없고, 넣으면 이 앱 자체가 Expo Go에서 돌지 않게 됩니다). 같은 작품을 브라우저의 Choreon에서 열면 내보낼 수 있습니다. 로그인해 두었다면 이 기기에서 고친 내용은 그대로 저쪽에도 있습니다.',
    needsSignIn: '로그인한 뒤 가져와 주세요',
    imported: (title: string) => `「${title}」(으)로 가져왔습니다`,
    importFailed: '가져오지 못했습니다',
    unreadableFile: '파일을 읽지 못했습니다',
    wrongShape: '파일 형식이 다릅니다',
    wrongVersion: '이 형식은 읽을 수 없습니다(다른 버전에서 내보낸 파일입니다)',
    noProject: '작품 정보가 들어 있지 않습니다',
    incomplete: '댄서·장면·위치 중 무언가가 부족합니다',
  },

  share: {
    title: '공유',
    summary: '링크 전달·새로 만들기',
    description:
      '링크를 아는 사람이 동선을 볼 수 있습니다. 편집은 할 수 없고 곡은 들어가지 않습니다.',
    toggle: '이 작품을 공유',
    toggleNote: '끄면 나눠준 링크가 즉시 열리지 않게 됩니다.',
    link: '링크',
    send: '링크 보내기',
    rotate: '링크 새로 만들기',
    rotateNote: '이전에 나눠준 링크는 열리지 않게 됩니다.',
    rotateTitle: '링크를 새로 만들까요',
    rotateDescription: '이전에 나눠준 링크는 그 즉시 열리지 않게 됩니다.',
    rotateConfirm: '새로 만들기',
    failed: '공유 설정을 바꾸지 못했습니다',
    needsProject: '작품을 연 뒤에 공유해 주세요',
    off: '아직 공유하지 않았습니다',
  },

  language: {
    section: '언어',
    note: '고른 언어는 기기에 남습니다.',
  },

  supabase: {
    section: 'Supabase',
    checking: '확인 중…',
    reached: '연결됨',
    failed: (status: number) => `연결 실패(${status})`,
    offline: '연결 실패(통신할 수 없습니다)',
    signedIn: '로그인 중',
    signedOut: '로그아웃 상태',
    platform: '환경',
  },

  formationNames: {
    row: '가로 한 줄',
    rowPair: '나란히',
    rowFront: '앞쪽 가로 줄',
    rowBack: '뒤쪽 가로 줄',
    column: '세로 한 줄',
    columnPair: '앞뒤로 한 줄',
    diagonal: '대각선',
    diagonalLine: '대각선 줄',
    lShape: 'L자',
    xShape: 'X자',
    wShape: 'W자(지그재그)',
    diamond: '다이아몬드',
    circle: '원',
    circleCenter: '원＋가운데',
    arc: '아치',
    wedgeIn: '뒤가 좁은 팔자',
    wedgeOut: '뒤가 넓은 쐐기',
    triangle: (rows: number[]) => `삼각(뒤 ${rows[0]}·앞 ${rows[1]})`,
    triangleDown: (rows: number[]) => `역삼각(뒤 ${rows[0]}·앞 ${rows[1]})`,
    v: (rows: number[]) => `V자(뒤부터 ${rows.join('-')})`,
    vDown: (rows: number[]) => `역V자(뒤부터 ${rows.join('-')})`,
    twoRows: (rows: number[]) => `두 줄(${rows.join('-')})`,
    twoColumns: (rows: number[]) => `세로 두 줄(${rows.join('-')})`,
    stagger: (rows: number[]) => `엇갈림(${rows.join('-')})`,
    arcRows: (rows: number[]) => `아치 두 줄(${rows.join('-')})`,
    grid: (rows: number[]) => `${rows[0]}×${rows[1]} 격자`,
  },
};
