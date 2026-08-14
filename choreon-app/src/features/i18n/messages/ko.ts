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

  common: {
    on: '켬',
    off: '끔',
    retry: '다시 시도',
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
      '곡을 넣으면 전체 재생의 시계가 곡이 됩니다. 넣지 않아도 초만으로 재생됩니다. 앱을 다시 열면 다시 선택해야 합니다.',
  },

  scenes: {
    section: '장면',
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
    remove: '이 장면 삭제',
    removeConfirm: (name: string, dancers: number) =>
      `정말 「${name}」을(를) 삭제(${dancers}명의 위치도 함께 사라집니다)`,
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
    removeConfirm: (name: string) => `정말 ${name}을(를) 삭제`,
    hint: '무대나 위 목록에서 한 명을 고르면 색을 바꾸거나 삭제할 수 있습니다',
    addFailed: '댄서를 추가하지 못했습니다',
    removeFailed: '이 사람을 삭제하지 못했습니다',
    colorFailed: '색을 저장하지 못해 되돌렸습니다',
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
    section: '기기에 저장',
    loading: '(불러오는 중)',
    audienceOnTop: '객석을 위로',
    dancerName: '댄서 이름',
    dancerNameAlways: '항상',
    dancerNameNever: '표시 안 함',
    grid: '눈금',
    gridSquare: '격자',
    gridNone: '없음',
    swipe: '밀어서 장면 넘기기',
    path: '동선 표시',
    marks: '바미리(객석 쪽 눈금)',
    blindSpot: '얼굴 가림 찾기',
    badgeNote:
      '동그라미 어깨의 표시: 얼굴＝앞사람에게 가려짐 / 숫자＝다음 장면으로의 이동이 너무 빠름(m/s, 3.5 초과 시 표시). 속도 표시는 항상 나옵니다.',
    storageNote:
      '위 두 가지는 설정, 눈금은 「표시와 모드」입니다. 웹은 localStorage, iOS/Android는 AsyncStorage에 저장합니다.',
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
