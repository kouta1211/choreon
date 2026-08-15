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
    guestTitle: '첫 대형',
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
      focus: '이 사람에 주목',
      focusOn: '주목 중',
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
        none: '없음',
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
      summary: '로그인·작품 열기',
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
