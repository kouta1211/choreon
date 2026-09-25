import type { Messages } from "@/features/i18n/messages/ja";

/**
 * 韓国語。
 *
 * 무대 용어는 실제로 쓰는 말에 맞춰 두었다
 * (バックステージ = 무대 뒤, 客席側 = 객석 쪽, バミリ = 바닥 표시,
 * 顔被り = 가림, 導線 = 동선).
 *
 * `satisfies` を付けてあるので、キーが欠けると tsc が落ちる。
 */
export const ko = {
  language: {
    label: "언어",
    description: "이 기기에 저장됩니다",
  },

  // 인원 배분은 무대 뒤에서 객석 쪽 순서
  formations: {
    row: "가로 한 줄",
    rowPair: "나란히",
    rowFront: "앞쪽 가로 줄",
    rowBack: "뒤쪽 가로 줄",
    column: "세로 한 줄",
    columnPair: "앞뒤로 한 줄",
    diagonal: "대각선",
    diagonalLine: "대각선 줄",
    lShape: "L자",
    xShape: "X자",
    wShape: "W자(지그재그)",
    diamond: "다이아몬드",
    circle: "원",
    circleCenter: "원＋가운데",
    arc: "아치",
    wedgeIn: "뒤가 좁은 팔자",
    wedgeOut: "뒤가 넓은 쐐기",
    triangle: (rows: number[]) => `삼각(뒤 ${rows[0]}·앞 ${rows[1]})`,
    triangleDown: (rows: number[]) => `역삼각(뒤 ${rows[0]}·앞 ${rows[1]})`,
    v: (rows: number[]) => `V자(뒤부터 ${rows.join("-")})`,
    vDown: (rows: number[]) => `역V자(뒤부터 ${rows.join("-")})`,
    twoRows: (rows: number[]) => `두 줄(${rows.join("-")})`,
    twoColumns: (rows: number[]) => `세로 두 줄(${rows.join("-")})`,
    stagger: (rows: number[]) => `엇갈림(${rows.join("-")})`,
    arcRows: (rows: number[]) => `아치 두 줄(${rows.join("-")})`,
    grid: (rows: number[]) => `${rows[0]}×${rows[1]} 격자`,
  },

  templateSheet: {
    shapeCount: (n: number) => `${n}종`,
    needsTwoNotice:
      "포메이션을 고르려면 2명 이상이 필요합니다. 헤더의 사람 아이콘에서 댄서를 추가하세요.",
    castCount: (n: number) => `${n}명`,
    current: "현재",
    matchingCast: (n: number) => `무대에 있는 ${n}명에 맞춰 보여 주고 있습니다`,
    forCast: (n: number) => `${n}명을 위한 모양입니다.`,
    leftOver: (n: number) =>
      `남는 ${n}명은 지금 위치에 그대로 있습니다(사라지지 않습니다).`,
    emptySpots: (n: number) => `${n}자리가 비게 됩니다(앞줄부터 채웁니다).`,
    title: "포메이션",
    needsTwo: "2명 이상",
    spacingLabel: "간격",
    spacing: { narrow: "좁게", normal: "기본", wide: "넓게" },
    flipX: "좌우 반전",
    flipY: "앞뒤 반전",
    rotate: "90° 회전",
    apply: "이 모양으로 바꾸기",
    applyNamed: (name: string) => `${name}(으)로 바꾸기`,
    applied: (name: string) => `${name}(으)로 바꿨습니다`,
    appliedPartial: (name: string, leftOut: number) =>
      `${name}(으)로 바꿨습니다(${leftOut}명은 그대로)`,
    undo: "실행 취소",
    failed: "포메이션을 적용하지 못했습니다",
  },

  themeSheet: {
    backToList: "목록으로 돌아가기",
    textureTitle: "배경 재질",
    textureNote:
      "바탕 위에 옅게 겹치는 장식입니다. 무대 안에는 적용되지 않습니다.",
    themeCount: (n: number) => `${n}종`,
    previewMode: "모드",
    title: "화면 모양",
    all: "전체",
    dark: "어두운 계열",
    material: "종이·재질 계열",
    selected: "선택됨",
    deviceOnly: "이 기기에만 저장",
    apply: "이 모양으로 하기",
  },

  themes: {
    midnight: "미드나이트 핑크",
    neon: "네온 시안",
    amber: "앰버 스테이지",
    mono: "모노크롬",
    chalk: "초크보드",
    paper: "크림 페이퍼",
    gridnote: "그래프 노트",
    kraft: "크라프트 프레스",
    tracing: "트레이싱 시트",
    whiteboard: "마커 보드",
  },

  themeSubtitles: {
    midnight: "기본",
    neon: "발광·유리",
    amber: "무대 조명·마루",
    mono: "화면에 색을 쓰지 않음",
    chalk: "어두운 채로 재질만 바꿈",
    paper: "크림지·빨간 연필",
    gridnote: "만년필·빨간 펜",
    kraft: "두꺼운 종이·가라앉은 글자",
    tracing: "다음 장면이 비쳐 보임",
    whiteboard: "굵은 마커·진한 색",
  },

  textures: {
    flat: "단색",
    nebula: "네뷸라",
    horizon: "호리존트",
    spot: "스포트라이트",
    grid: "모눈과 눈금",
    grain: "그레인",
    curtain: "암막",
  },

  editor: {
    backToProjects: "작품 목록으로",
    backToStart: "시작 화면으로 돌아가기",
    addDancer: "댄서 추가",
    projectName: "작품 이름",
    projectNameFailed: "작품 이름을 바꾸지 못했습니다",
    upstage: "무대 뒤",
    houseLeft: "객석 왼쪽",
    houseRight: "객석 오른쪽",
    downstage: "객석 쪽",
    noScenes: "장면이 없습니다",
    /** シーンがまだ無いまま曲だけ流しているとき（2026-08-22） */
    musicOnly: "음악만 재생 중입니다",
    noScenesYet: "아직 장면이 없습니다",
    /** 音先の作品で、曲は鳴っているがまだ最初のシーンへ着いていない間 */
    beforeFirstScene: "여기에는 아직 장면이 없습니다",
    createFirstScene: "첫 장면 만들기",
    copyCurrent: "지금 배치를 복사해서 추가",

    narrowScreen: {
      title: "지금 브라우저 너비에서는 조작할 수 없습니다",
      body: "휴대폰에서는 공유된 안무를 보는 기능만 제공합니다.\n이 너비에서는 편집을 제한하고 있습니다.\n계속 편집하려면 브라우저 창을 넓혀 주세요.",
      openViewer: "보기만 한다면 이쪽",
      pasteLabel: "공유 링크를 붙여 넣어 열기",
      pastePlaceholder: "https://... 또는 /view/...",
      pasteOpen: "열기",
      pasteInvalid:
        "공유 링크로 읽을 수 없었습니다. 받은 URL을 그대로 붙여 넣어 주세요.",
    },

    view: {
      title: "메뉴",
      stageGroup: "스테이지 보이기",
      appGroup: "앱",
      counts: (dancers: number, scenes: number) =>
        `${dancers}명 · ${scenes}장면`,
      gridLabel: "눈금",
      gridSquare: "격자",
      gridCircle: "동심원",
      gridNone: "없음",
      path: {
        label: "동선 표시",
        description: "다음 장면으로 가는 움직임을 선으로 그립니다",
      },
      blindSpot: {
        label: "가림 확인",
        description: "앞사람 바로 뒤에 선 사람을 표시합니다",
      },
      collision: {
        label: "충돌 확인",
        description: "이동 중에 부딪히는 조합에 표시를 냅니다",
      },
      moveStrain: {
        label: "너무 빠른 이동",
        description: "걸어서는 늦는 속도의 이동에 표시를 냅니다",
      },
      stageMarks: {
        label: "바닥 표시",
        description: "모든 장면의 위치를 바닥에 겹쳐 보여 줍니다",
      },
      thisProject: "이 작품",
      music: "음악",
      share: "공유",
      review: "대형 봐 달라고 하기",
      assist: "말로 부탁하기",
      exportVideo: "영상으로 만들기",
      tour: "튜토리얼 시작하기",
      settings: "설정",
    },

    shortcuts: {
      title: "키보드 조작",
      description: "만드는 화면(PC·태블릿)에서 쓸 수 있습니다.",
      hint: "이 목록은 ? 키로도 열 수 있습니다",
      groups: {
        play: "재생",
        select: "선택",
        move: "이동",
        undo: "되돌리기",
      },
      items: {
        playPause: "재생 / 정지",
        prevNextScene: "이전 / 다음 장면으로",
        selectAll: "이 장면에 선 사람 전원 선택",
        addToSelection: "선택에 추가",
        subtractFromSelection: "감싼 사람을 선택에서 제외",
        clearSelection: "선택 해제·열린 판 닫기",
        nudgeSmall: (units: number) => `${units} 칸씩 이동`,
        nudgeLarge: (units: number) => `${units} 칸씩 이동`,
        contextMenu: "방향·정렬·삭제 메뉴 열기",
        undo: "되돌리기",
        redo: "다시 실행",
        browserBack: "브라우저의 뒤로도 되돌리기가 됩니다",
      },
      keys: {
        click: "클릭",
        drag: "감싸기",
        rightClick: "우클릭",
        back: "뒤로",
      },
    },

    dock: {
      openScenes: "장면 목록 열기",
      cancelCountIn: "카운트인 취소",
      pause: "정지",
      play: "마지막 장면까지 재생",
      /** シーンがまだ無いとき。進む先が無いので「最後のシーンまで」は嘘になる */
      playMusicOnly: "음악 재생",
      sceneSettings: (name: string) => `'${name}' 설정 열기`,
      /** 카운트로 센 이동 길이. 위치(3-5)와는 다른 형태로 쓴다 */
      moveCounts: (counts: string) => ` · ${counts}카운트 동안 이동`,
      addScene: "장면 추가",
      /** 曲があるときは鳴らしている最中しか増やせない（canAddScene） */
      addSceneNeedsPlayback:
        "음악을 재생하면서 누르면 그 위치에 장면이 생깁니다",
      hideTimeline: "시간축 접기",
      showTimeline: "시간축 펼치기",
      playFromHere: "지금 보고 있는 장면부터 재생",
      playFrom: (name: string) => `'${name}'부터 재생(지난번에 시작한 곳)`,
    },

    scenes: {
      /** 위치 칸의 머리글. 초가 아니라 카운트(3-5)로 입력한다 */
      countPosition: "카운트",
      counts: "카운트",
      seconds: "초",
      title: "장면",
      dancers: "댄서",
      sceneName: "장면 이름",
      summary: (count: number, counts: string) =>
        `${count}개 · 전체 ${counts}카운트`,
      /** 목록 행에 표시하는 **다음 장면으로 나가는** 구간.
       *  아래의 유지／이동과 같은 구간이어야 한다 */
      moveOut: (counts: string) => ` · 다음까지 ${counts}`,
      /** 구간을 둘로 나누는 칸의 머리글. 어느 쪽이든 입력할 수 있다 */
      hold: "유지 카운트",
      holdLabel: "이 대형 그대로 멈춰 있는 카운트",
      move: "이동 카운트",
      moveCountsLabel: "다음 장면으로 이동하는 데 쓰는 카운트",
      /** 나누고 있는 구간의 길이. 막대 위에 덧붙인다 */
      segmentTotalCounts: (counts: string) => `구간 ${counts}카운트`,
      /** 막대 본체. 왼쪽이 유지, 오른쪽이 이동 */
      splitBar: "유지와 이동의 경계",
      splitBarValue: (hold: number, move: number) =>
        `유지 ${hold}카운트, 이동 ${move}카운트`,
      delete: "삭제",
      /** 한꺼번에 지우기 위한 "선택" 모드(목록 머리글 오른쪽) */
      select: "선택",
      selectDone: "완료",
      selectAll: "전체 선택",
      selectNone: "선택 해제",
      selectHint: "삭제할 장면을 누르세요",
      deleteChecked: (count: number) => `${count}개 삭제`,
    },

    save: {
      save: "저장",
      saved: "저장됨",
      failed: "저장하지 못했습니다",
      retry: "다시 시도",
      unsaved: "저장하지 않은 변경이 있습니다",
    },

    history: {
      undo: "실행 취소",
      undoHint: (mod: string) => `실행 취소 (${mod}+Z)`,
      redo: "다시 실행",
      redoHint: (mod: string) => `다시 실행 (${mod}+Shift+Z)`,
    },

    template: {
      open: "포메이션에서 고르기",
      openSame: "포메이션에서 고르기(앞 장면과 같은 배치 그대로입니다)",
    },

    a11y: {
      dragHelp:
        "댄서를 끌어서 옮길 수 있습니다. 선택한 상태에서 화살표 키로도 옮길 수 있고, Shift를 누르면 더 크게 움직입니다.",
      dragStart: "댄서 이동을 시작했습니다.",
      dragEnd: "댄서 위치를 확정했습니다.",
      dragCancel: "댄서 이동을 취소했습니다.",
    },

    contextMenu: {
      facing: {
        heading: "방향",
        note: "좌우는 객석에서 본 기준",
        front: "객석",
        frontLeft: "객석 왼쪽",
        left: "왼쪽",
        backLeft: "뒤 왼쪽",
        back: "뒤",
        backRight: "뒤 오른쪽",
        right: "오른쪽",
        frontRight: "객석 오른쪽",
        turn: (label: string) => `${label} 방향으로`,
      },
      align: {
        heading: "정렬",
        note: "무게중심에 맞춥니다",
        row: "가로 한 줄로 맞추기",
        column: "세로 한 줄로 맞추기",
        spreadX: "좌우 같은 간격",
        spreadY: "앞뒤 같은 간격",
      },
      deleteOne: "삭제",
      deleteMany: (count: number) => `${count}명 삭제`,
      deleteManyTitle: (count: number) => `${count}명을 삭제할까요?`,
      deleteManyMeta: (positions: number) => `배치 ${positions}건`,
      selectAll: "전원 선택",
      addDancer: "댄서 추가",
    },

    overlap: {
      title: (name: string) => `${name} 와(과) 겹칩니다`,
      titleMany: (count: number) => `${count}명과 겹칩니다`,
      description:
        "그대로 두면 위에 있는 사람만 잡을 수 있습니다. 조금 옆으로 옮길까요?",
      confirm: "옆으로 옮기기",
    },

    errors: {
      metronome: "클릭 설정을 저장하지 못했습니다",
      position: "위치를 저장하지 못했습니다",
      rotation: "방향을 저장하지 못했습니다",
      curve: "곡선을 바꾸지 못했습니다",
      retry: "다시 시도",
    },
  },

  common: {
    close: "닫기",
    numberField: {
      notANumber: "숫자를 입력해 주세요",
      tooSmall: (min: number) => `${min}보다 작게 할 수 없습니다`,
      tooLarge: (max: number) => `${max}보다 크게 할 수 없습니다`,
      apply: "적용",
      applyCount: (count: number) => `적용 (${count}건)`,
      fixRange: "입력 가능한 범위로 고쳐 주세요",
      notApplied: "적용을 누를 때까지 바뀌지 않습니다",
      applied: "적용했습니다",
    },
    back: "뒤로",
    loading: "불러오는 중",
    rename: (label: string) => `${label} 변경`,
    saveToCloud: "저장",
    settings: "설정",
    appearance: "화면 모양 바꾸기",
    undoFailed: "실행 취소하지 못했습니다",
    redoFailed: "다시 실행하지 못했습니다",
    undoTargetGone: "대상이 삭제되어 실행 취소할 수 없었습니다",
  },

  app: {
    description: "스마트폰으로 만드는 댄스 포메이션",
    ogLocale: "ko_KR",
  },

  auth: {
    signIn: "로그인",
    signUp: "회원가입",
    createAccount: "계정 만들기",
    email: "이메일 주소",
    password: "비밀번호",
    passwordSignUp: "비밀번호(6자 이상)",
    signingIn: "로그인 중...",
    signingUp: "가입 중...",
    submitSignUp: "가입하기",
    haveAccount: "이미 계정이 있으시면",
    noAccount: "계정이 없으시면",
    wrongCredentials: "이메일 주소 또는 비밀번호가 맞지 않습니다.",
    alreadyRegistered: "이미 가입된 이메일 주소입니다.",
    signUpFailed: "가입하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    confirmSent: "확인 메일을 보냈습니다.",
    confirmOpen: "메일 안의 링크를 열면 가입이 완료됩니다.",
    backToSignIn: "로그인 화면으로 돌아가기",
    insecure:
      "이 화면은 암호화되지 않은 연결로 열려 있어 로그인할 수 없습니다.",
    insecureWhy: (https: string, localhost: string) =>
      `브라우저는 ${https}와 ${localhost}만 안전하다고 보고, 그 밖에서는 로그인에 필요한 기능을 끕니다. 실제 기기에서 시험할 때는`,
    insecureHow: "로 열어 주세요.",
    draftPending:
      "확인이 끝날 때까지 작품은 저장되지 않습니다. 이 탭을 닫지 말고 메일의 링크를 연 뒤 돌아와 주세요.",
  },

  welcome: {
    lastViewed: {
      label: "이전에 본 안무",
    },
    guestStart: "게스트로 시작하기",
    withTour: "사용법 안내부터 시작하기",
    tourAsk: {
      title: "사용법 안내를 볼까요?",
      body: "무대·댄서·장면 세 가지를 실제 화면을 짚어 가며 1분 정도 안내합니다.",
      withTour: "안내부터 시작하기",
    },
    or: "또는",
  },

  projects: {
    count: (n: number) => `작품 ${n}개`,
    empty: "아직 작품이 없습니다.",
    emptyHint: "위 입력란에 곡 이름을 넣으면 무대가 하나 만들어집니다.",
    newTitle: "새 작품",
    newName: "작품 이름",
    create: "작품 만들기",
    createFailed: "작품을 만들지 못했습니다",
    renamedForClash: (title: string) =>
      `같은 이름이 있어서 '${title}'으로 만들었습니다`,
    noScenes: "장면 0",
    remove: (title: string) => `${title} 삭제`,
    deleteTitle: (title: string) => `'${title}'을(를) 삭제할까요?`,
    deleteDescription:
      "이 작품의 장면·댄서·위치가 모두 사라집니다. 삭제는 되돌릴 수 없습니다.",
    deleteMetaScenes: (n: number) => `${n}장면`,
    deleteMetaDancers: (n: number) => `${n}명`,
    deleteMetaPositions: (n: number) => `${n}개 위치`,
    deleteFailed: "작품을 삭제하지 못했습니다",
    renameFailed: "이름을 바꾸지 못했습니다",
    guestTitle: "첫 포메이션",
    sceneName: (index: number) => `장면${index}`,
  },

  confirm: {
    cannotUndo: "삭제는 되돌릴 수 없습니다.",
    undoableNote: "(이동과 방향 변경은 「실행 취소」로 되돌릴 수 있습니다)",
    cancel: "취소",
    deleting: "삭제 중...",
    delete: "삭제하기",
  },

  tour: {
    stageTitle: "여기가 무대입니다",
    stageBody:
      "무대의 위아래에 무대 뒤와 객석 쪽 표시가 나옵니다. 동그라미가 댄서이고, 잡아서 옮길 수 있습니다. 눈금은 센터에서의 거리입니다.",
    timelineTitle: "가로 위치가 카운트입니다",
    timelineBody:
      "각 컷은 '몇 세트의 몇 카운트인지'의 위치에 놓입니다(3-5는 3세트째의 5카운트). 컷을 옆으로 끌면 그 위치가 움직이고, 간격이 그대로 다음 대형으로 넘어가는 카운트 수가 됩니다.",
    addTitle: "대형 추가하기",
    addBody:
      "선택한 장면 옆에, 지금 배치를 복사한 대형을 만듭니다. 만들고 나서 옮기는 것이 기본 흐름입니다. 곡을 재생 중이면 듣고 있는 위치에 생깁니다.",
    viewTitle: "메뉴",
    viewBody:
      "격자·동선·가림 경고 같은 전환과, 음악·영상·설정으로 들어가는 입구가 여기 있습니다. 이 안내를 다시 보는 것도 여기서 할 수 있습니다.",
    back: "뒤로",
    close: "닫기",
    last: "시작하기",
    next: "다음",
    nextWithProgress: "다음（{current}/{total}）",
    skip: "skip",
  },

  notFound: {
    title: "찾을 수 없음 — Choreon",
    heading: "이 페이지를 찾을 수 없습니다",
    body: "주소가 다르거나, 공유 링크가 다시 만들어져 열리지 않습니다. 링크를 보낸 사람에게 새 링크를 받아 주세요.",
    toProjects: "작품 목록으로",
  },

  offline: {
    title: "오프라인 — Choreon",
    heading: "지금 연결이 되지 않습니다",
    body: "한 번 열었던 화면은 그대로 볼 수 있습니다. 이전 화면으로 돌아가거나, 연결이 돌아온 뒤 다시 열어 주세요.",
    toProjects: "작품 목록으로",
    lastViewed: (title: string) => `「${title}」로 돌아가기`,
  },

  data: {
    needsSignIn: "로그인한 뒤에 가져와 주세요",
    imported: "가져왔습니다",
    importFailed: "가져오지 못했습니다",
    resetTitle: "이 작품을 비울까요?",
    resetDescription:
      "장면과 댄서를 모두 지웁니다. 작품 자체(이름·무대 크기·곡의 시작 위치)는 남습니다. 되돌릴 수 없습니다.",
    resetMetaScenes: (n: number) => `${n}장면`,
    resetMetaDancers: (n: number) => `${n}명`,
    resetConfirm: "비우기",
    resetFailed: "비우지 못했습니다",
    unreadableFile: "파일을 읽지 못했습니다",
    wrongShape: "파일의 형식이 다릅니다",
    wrongVersion: "이 형식은 읽을 수 없습니다(다른 버전에서 내보낸 파일입니다)",
    noProject: "작품 정보가 들어 있지 않습니다",
    incomplete: "댄서·장면·위치 중 하나가 빠져 있습니다",
  },

  sceneActions: {
    renameFailed: "장면 이름을 바꾸지 못했습니다",
    retimeFailed: "장면의 시각을 바꾸지 못했습니다",
    deleteTitle: (name: string) => `'${name}'을(를) 삭제할까요?`,
    deleteDescription:
      "이 장면의 위치와, 여기로 들어오는 동선도 함께 사라집니다. 삭제는 되돌릴 수 없습니다(이동과 방향은 되돌릴 수 있습니다).",
    deleteMeta: (dancers: number) => `${dancers}명의 위치`,
    moveSecondsFailed: "이동 카운트를 바꾸지 못했습니다",
    deleteManyTitle: (count: number) => `장면 ${count}개를 삭제할까요?`,
    deleteFailed: "장면을 삭제하지 못했습니다",
    remove: (name: string) => `'${name}' 삭제`,
  },

  dbErrors: {
    missingColumn:
      "DB 스키마가 오래된 것 같습니다. supabase/schema.sql 을 Supabase SQL Editor에서 실행해 주세요",
    insufficientPrivilege:
      "권한이 없습니다. 테이블의 GRANT와 RLS 정책을 확인해 주세요",
  },

  viewer: {
    rotate: {
      title: "세로로 봐 주세요",
      body: "가로로 두면 무대가 화면을 가득 채워서 아래의 이동 순서를 읽을 수 없습니다. 세로로 돌리면 이어서 볼 수 있습니다.",
    },
    move: {
      still: "제자리",
      to: (direction: string, steps: number) =>
        `${direction}으로 약 ${steps}걸음`,
      direction: (
        sideways: "left" | "right" | null,
        depth: "front" | "back" | null,
      ) =>
        `${sideways === null ? "" : sideways === "left" ? "하수" : "상수"}${
          depth === null ? "" : depth === "front" ? " 앞" : " 뒤"
        }`.trim(),
      turn: (facing: string) => `＋ ${facing}`,
    },
    facing: {
      0: "객석 쪽",
      45: "하수 앞쪽",
      90: "하수 쪽",
      135: "하수 뒤쪽",
      180: "무대 뒤쪽",
      225: "상수 뒤쪽",
      270: "상수 쪽",
      315: "상수 앞쪽",
    },
    route: {
      change: "변경",
      title: (name: string) => `${name}의 동선`,
      me: "나",
      everyone: "전체",
      all: "전부",
      summary: (scenes: number, total: string) =>
        `${scenes}장면 · 전체 ${total}`,
      lastFormation: "여기가 마지막 대형입니다",
      startHere: "여기에서 시작합니다",
      stepsNote: "걸음 수는 한 걸음 60cm·한 칸 90cm로 계산한 어림값입니다.",
      sidesNote: "상수／하수는 객석에서 본 방향입니다.",
      fast: " — 빠름",
      travelCounts: (counts: string) => `${counts}카운트에 걸쳐`,
      travelCountsAside: (counts: string) => `(${counts}카운트에 걸쳐)`,
      hereNow: " · 지금 여기",
      tooFast: "걸어서는 갈 수 없는 속도입니다",
      reselect: "포지션 다시 고르기",
      sceneListOpen: "장면 목록 열기",
      sceneListTitle: "장면",
      sceneListNote: "누르면 그 장면으로 이동합니다",
      viewMenu: "표시 바꾸기",
      showNames: "이름 표시",
      play: "통으로 재생",
      stop: "정지",
      paths: "동선",
      noMusic: "곡은 재생되지 않습니다",
      clickOnly: "박자만 울립니다",
    },
    entry: {
      question: "본인은 누구인가요?",
      note: "선택하면 그 사람에게 초점을 맞춥니다.",
      position: (name: string) => `${name}의 위치`,
      counts: (scenes: number, dancers: number, total: string) =>
        `${scenes} 장면 · ${dancers} 명 · ${total}`,
      pick: "본인을 골라 주세요",
      pickNamed: (name: string) => `'${name}'(으)로 보기`,
      skip: "고르지 않고 전체 보기",
    },
  },

  share: {
    title: "공유",
    enable: "링크를 아는 사람이 볼 수 있음",
    resume: "이 링크로 다시 공유하기",
    enabledNote:
      "링크를 연 사람은 자신에게 포커스한 대형을 볼 수 있습니다.",
    disabledNote:
      "지금은 공유하고 있지 않습니다. 링크를 가진 사람도 열 수 없습니다",
    noKey:
      "이 작품에는 아직 공유용 키가 없습니다. Supabase SQL Editor에서 supabase/schema.sql 을 실행하면 사용할 수 있습니다.",
    everyone: "공유 링크",
    copy: "링크 복사",
    copied: "복사했습니다",
    regenerate: "링크 새로 만들기",
    regenerateTitle: "링크를 새로 만들까요?",
    regenerateDescription:
      "이미 나눠 준 링크는 바로 열리지 않게 됩니다. 새 링크를 다시 보내 주세요.",
    regenerateConfirm: "새로 만들기",
    regenerated: "새 링크로 바꿨습니다",
    regenerateFailed: "링크를 새로 만들지 못했습니다",
    copyFailed: "복사하지 못했습니다",
    saveFailed: "공유 설정을 바꾸지 못했습니다",
    musicNote:
      "곡은 상대에게 전달되지 않습니다. 음원은 이 기기에만 있습니다. 메뉴 → 곡 에서 클릭을 켜 두면 보는 사람의 기기에서도 박자만은 울립니다.",
    musicNoteWithClick:
      "곡은 상대에게 전달되지 않습니다. 음원은 이 기기에만 있습니다. 클릭이 켜져 있으므로 보는 사람의 기기에서 박자가 울립니다.",
    shareMusic: "곡도 함께 보내기",
    shareMusicSize: (size: string) => `${size} 를 올립니다`,
    shareMusicOn:
      "보는 사람의 기기에서도 곡이 재생됩니다. 공유를 멈추면 그 자리에서 들을 수 없게 됩니다.",
    shareMusicWorking: "처리 중…",
    musicUploadFailed: "곡을 보내지 못했습니다",
    musicBlockedGuest: "작품을 먼저 저장하면 곡도 보낼 수 있습니다",
    musicBlockedMissing: "이 기기에 음원이 없습니다. 곡을 다시 고르면 보낼 수 있습니다",
    musicBlockedTooLarge: (max: string) =>
      `${max} 를 넘는 곡은 보낼 수 없습니다. 더 작은 파일을 사용하세요`,
  },

  assist: {
    title: "말로 부탁하기",
    note: "하고 싶은 것을 써 주세요. 할 수 있는 것 중에서 고르고, 먼저 할 일을 보여 줍니다.",
    inputLabel: "하고 싶은 것",
    placeholder: "얼굴 가림을 전부 고쳐 줘",
    ask: "부탁하기",
    asking: "생각하고 있습니다...",
    again: "다시 부탁하기",
    examples: "예를 들면",
    exampleList: [
      "얼굴 가림을 전부 고쳐 줘",
      "바닥 표시를 보여 줘",
      "3번째 장면을 열어 줘",
      "한 줄로 세워 줘",
      "바닥 선을 동심원으로 해 줘",
    ],
    confirm: "이대로 진행",
    cancel: "취소",
    undoHint: "되돌리기로 사라집니다",
    targets: {
      paths: "이동선",
      blindSpot: "얼굴 가림 확인",
      marks: "바닥 표시",
      music: "음악",
      share: "공유",
      video: "동영상으로 만들기",
      settings: "설정",
      review: "대형 봐 달라고 하기",
      template: "대형에서 고르기",
      addDancer: "댄서 추가",
    },
    plan: {
      clearBlindSpots: (count: number) => `얼굴 가림을 고친다(${count}명)`,
      movesSideways: (name: string, from: number, to: number) =>
        `${name}번을 ${from} → ${to} 으로(가로만)`,
      noEscape: (name: string) => `${name}번은 피할 곳이 없어 그대로`,
      thisSceneOnly: "지금 열려 있는 장면만. 앞뒤는 움직이지 않습니다",
      extendFastMoves: (count: number) => `이동에 시간을 더한다(${count}건)`,
      retime: (sceneName: string, from: number, to: number) =>
        `「${sceneName}」을 ${from}초 → ${to}초 로`,
      walkable: (name: string) => `${name}번이 걸을 수 있는 속도가 됩니다`,
      rippleNote: "이후 장면도 같이 뒤로 밀립니다",
      applyFormation: (name: string, count: number) =>
        `${count}명을 「${name}」로 세운다`,
      nearestAssignment: "지금 위치에서 가장 가까운 자리로 배정합니다",
      setGrid: (name: string) => `바닥 선을 「${name}」로 했습니다`,
      turnedOn: (name: string) => `${name}을 보이게 했습니다`,
      turnedOff: (name: string) => `${name}을 숨겼습니다`,
      alreadyOn: (name: string) => `${name}은 이미 보이고 있습니다`,
      alreadyOff: (name: string) => `${name}은 이미 숨겨져 있습니다`,
      opened: (name: string) => `${name}을 열었습니다`,
      selectScene: (number: number, name: string) =>
        `${number}번 「${name}」을 열었습니다`,
    },
    nothingToDo: "지금은 할 일이 없습니다",
    errors: {
      notConfigured: "이 기능은 아직 설정되어 있지 않습니다",
      needsSignIn: "로그인한 뒤에 시도해 주세요",
      unreadable: "읽지 못했습니다",
      tooLong: "부탁이 너무 깁니다. 짧게 써 주세요",
      notUnderstood:
        "잘 읽어내지 못했습니다. 「얼굴 가림을 전부 고쳐 줘」처럼 하고 싶은 것을 하나만 써 보세요",
      unavailable: "잘 되지 않았습니다. 잠시 후 다시 시도해 주세요",
      modelMissing: "부탁할 상대를 찾지 못했습니다. 설정을 고쳐야 합니다",
      rejected: "부탁하기 위한 키가 거부되었습니다. 설정을 고쳐야 합니다",
      rateLimited:
        "부탁할 수 있는 횟수의 상한에 도달했습니다. 잠시 시간을 두고 다시 시도해 주세요",
      busy: "지금 혼잡합니다. 잠시 기다린 뒤 다시 시도해 주세요",
      tooSlow: "답변에 너무 오래 걸렸습니다. 다시 시도해 주세요",
      empty: "답변이 비어 있었습니다. 다시 시도해 주세요",
    },
  },

  review: {
    errors: {
      notConfigured: "의견 기능이 설정되어 있지 않습니다",
      needsSignIn: "로그인한 뒤에 시도해 주세요",
      unreadable: "읽지 못했습니다",
      noFormation: "대형이 없습니다",
      emptyScene: "이 장면에는 아직 아무도 없습니다",
      unavailable: "의견을 받지 못했습니다. 잠시 후 다시 시도해 주세요",
      modelMissing: "의견 기능의 상대를 찾지 못했습니다. 설정을 고쳐야 합니다",
      rejected: "의견 기능의 키가 거부되었습니다. 설정을 고쳐야 합니다",
      rateLimited:
        "부탁할 수 있는 횟수의 상한에 도달했습니다. 잠시 시간을 두고 다시 시도해 주세요",
      busy: "의견 기능이 혼잡합니다. 잠시 기다린 뒤 다시 시도해 주세요",
      tooSlow: "의견을 받는 데 너무 오래 걸렸습니다. 다시 시도해 주세요",
      empty: "의견이 비어 있었습니다. 다시 시도해 주세요",
      garbled: "답변이 중간에 끊겼습니다. 다시 시도해 주세요",
    },
    title: "대형 봐 달라고 하기",
    note: "지금 열려 있는 장면의 위치만 보냅니다. 작품 이름과 댄서의 색은 보내지 않습니다. 돌아오는 것은 판정이 아니라 생각할 재료입니다.",
    good: "좋은 점",
    watch: "신경 쓰이는 점",
    decide:
      "고치기 버튼은 누를 때만 반영됩니다. 받아들일지는 직접 정해 주세요(되돌리기로 사라집니다).",
    applied: "반영했습니다",
    formationExample: "이렇게 세우면",
    formationApply: "이 배치로 하기",
    formationNote: "지금 위치에서 가장 가까운 자리로 배정합니다",
    audienceSide: "객석 쪽",
    scope: "봐 달라고 할 범위",
    scopeScene: "이 장면",
    scopePiece: "작품 전체",
    scopePieceNote:
      "모든 장면의 퍼짐 정도·무게중심·경고만 보냅니다(위치 자체는 보내지 않습니다). 흐름에 대한 이야기가 돌아옵니다.",
    inScene: (number: number, name: string) => `${number}. ${name}`,
    wholePiece: "작품 전체",
    run: "봐 달라고 하기",
    running: "보고 있습니다...",
    again: "다시 한번",
    failed: "의견을 받지 못했습니다",
    offline: "통신하지 못했습니다",
  },

  exportVideo: {
    title: "영상으로 만들기",
    unsupported:
      "이 기기의 브라우저에서는 영상을 만들 수 없습니다. PC의 Chrome이나 최신 iPhone의 Safari에서 시도해 주세요.",
    needsTwoScenes:
      "장면이 두 개 이상이면 그 사이의 움직임을 영상으로 만들 수 있습니다.",
    size: "크기",
    showNames: "이름 표시",
    running: (seconds: number) =>
      `내보내는 중… ${seconds}초 남았습니다. 이 화면을 닫지 말고 기다려 주세요.`,
    cancel: "중단",
    start: (seconds: number) => `${seconds}초 영상 만들기`,
    note: "내보내기는 작품과 같은 시간이 걸립니다(실제로 재생하면서 녹화하기 때문입니다).",
    contains: "들어가는 것: 무대·격자·댄서(방향 삼각형 포함)·위아래 표시·시각.",
    omits: "메트로놈 클릭은 들어가지 않습니다.",
    includeTitle: "함께 그릴 것",
    includeAudioTitle: "소리",
    includeAudio: "곡을 넣기",
    includeAudioNote:
      "곡의 처음부터 동영상 길이만큼 들어갑니다. 내보내는 중에는 울리지 않습니다.",
    includeAudioWarning:
      "이 동영상에는 곡이 들어갑니다. 건네는 상대에게 주의해 주세요(공유 링크에는 지금까지처럼 곡이 따라가지 않습니다).",
    saved: "영상을 저장했습니다",
    failed: "내보내지 못했습니다",
  },

  music: {
    title: "음악",
    pick: "기기에서 곡 고르기",
    pickAnother: "다른 곡 고르기",
    file: "음악 파일",
    remove: "곡 빼기",
    titleFailed: "곡 이름을 저장하지 못했습니다",
    missingOnDevice:
      "음원이 이 기기에 없습니다(곡은 작품에 기억되어 있습니다). 같은 곡을 다시 고르면 들을 수 있습니다.",
    notShared:
      "이 기기에 보관하므로 다시 열어도 들리지만, 공유한 상대에게는 따라가지 않습니다(시작 위치만 공유됩니다).",
    metronomeTitle: "곡이 없을 때의 박",
    metronome: "메트로놈",
    click: "클릭음 켜기",
    bpm: "속도(BPM)",
    bpmUnit: "BPM",
    bpmNote: "타임라인 바의 손잡이를 끌어도 같은 빠르기가 바뀝니다",
    tapTempo: "클릭해서 재기",
    tapTempoNote: "▶ 로 틀고, 곡에 맞춰 네 번쯤 클릭해 주세요",
    tapPlay: "이 구간 틀기",
    tapPause: "멈추기",
    checkBeat: "잰 빠르기로 소리내기",
    checkBeatOn: "소리 멈추기",
    tapTempoFor: (name: string) => `'${name}' 클릭해서 재기`,
    tapTempoCount: (count: number) => `${count}번 · 손을 멈추면 다시 재기`,
    beatsPerBar: "박자",
    beatsPerBarNote:
      "바뀌는 것은 메트로놈의 센 박과 타임라인의 굵은 선뿐입니다(여덟 박 세는 법은 그대로).",
    seconds: "초",
    span: (total: number, from: string, to: string) =>
      `전체 ${total}초 · ${from} ~ ${to}`,
    counts: (set: number, count: number) => `${set}세트 ${count}카운트`,
    placeBar: "안무를 곡의 어디에 얹을지",
    placeMove: "누르면 이 곡의 앞으로, 끌면 안무 전체를 앞뒤로 옮기기",
    placeStretch: "안무의 끝을 맞추기",
    placeSpan: (from: string, to: string) => `안무 ${from} ~ ${to}`,
    placeFailed: "곡에 얹는 방식을 저장하지 못했습니다",
    zoomIn: "타임라인 확대",
    zoomOut: "타임라인 축소",
    pxPerSecond: "px/초",
    stacked: (from: number, to: number) =>
      `장면 ${from}~${to}이(가) 겹쳐 있습니다. 누르면 펼쳐서 하나씩 고를 수 있습니다`,
    scenesShort: "장면",
    /* 곡 구분(2026-09-15). 쇼케이스는 한 무대에서 곡이 바뀐다.
       박의 열은 끊기지 않고, 끊기는 것은 음원에 얹는 방식뿐 */
    sectionsTitle: "곡 구분",
    sectionsNote:
      "쇼케이스 도중에 곡이 바뀔 때 사용합니다. 구분을 넣어도 대형은 움직이지 않습니다. 넣은 뒤에 그 구간만 빠르기와 시작 위치를 정할 수 있습니다.",
    sectionDefaultName: (order: number) => `${order}번째 곡`,
    sectionName: "곡 이름",
    sectionStart: (clock: string) => `${clock}부터`,
    sectionSplit: "여기서부터 다른 곡으로",
    sectionSplitNote: "선택한 장면에서 가장 가까운 8카운트 머리에서 나눕니다.",
    sectionNeedScene: "나눌 위치를 정하려면 장면을 선택하세요.",
    sectionRemove: "이 구분 없애기",
    sectionBpm: "이 구간의 빠르기(BPM)",
  },

  dancer: {
    add: {
      title: "댄서 추가",
      howMany: "몇 명 추가할까요?",
      minus: "한 명 줄이기",
      plus: "한 명 늘리기",
      count: "추가할 인원",
      people: "명",
      autoNote: "이름과 색은 정해져 있습니다. 여기서 바꿀 수 있습니다",
      /** 名前の欄。打たなければ、下に薄く出ている名前で作る */
      nameLabel: (nth: number) => `${nth}번째 사람의 이름`,
      colorLabel: (name: string) => `${name}의 색 선택`,
      spotsNote:
        "지금 보고 있는 장면의 빈 칸에 가운데부터 차례로 놓입니다. 겹치지 않으니 바로 끌어서 옮길 수 있습니다.",
      submit: (n: number) => `${n}명 추가하기`,
      cancel: "취소",
      addedOne: (name: string) => `${name}을(를) 무대에 추가했습니다`,
      addedMany: (n: number) => `${n}명을 무대에 추가했습니다`,
      failed: "댄서를 추가하지 못했습니다",
    },
    list: {
      title: "댄서",
      count: (n: number) => `${n}명`,
      empty: "이 장면에는 아직 아무도 없습니다.",
      sortLabel: "정렬",
      sorts: { added: "추가순", name: "이름순" },
    },
    inspector: {
      name: "댄서 이름",
      seconds: "초",
      focus: "마이 포커스",
      focusOn: "마이 포커스 중",
      remove: "댄서 삭제",
      deselect: "선택 해제",
      changeColor: (color: string) => `색을 ${color}(으)로 바꾸기`,
      customColor: "색을 직접 고르기",
      colorHardToSee:
      "지금 테마에서는 무대 바닥과 구분하기 어려운 색입니다. 그대로 사용할 수 있습니다.",
    customColorNote: "직접 고른 색은 테마를 바꿔도 그대로 나옵니다",
      rotate: "방향 바꾸기",
      curve: (name: string) => `${name}의 곡선 모양 조정`,
      deleteTitle: (name: string) => `'${name}'을(를) 삭제할까요?`,
      deleteDescription:
        "이 댄서의 위치와 동선이 모든 장면에서 사라집니다. 삭제는 되돌릴 수 없습니다(이동과 방향은 되돌릴 수 있습니다).",
      deleteMeta: (scenes: number) => `${scenes}개 장면의 위치`,
      nameFailed: "댄서 이름을 바꾸지 못했습니다",
      colorFailed: "색을 바꾸지 못했습니다",
      deleteFailed: "댄서를 삭제하지 못했습니다",
    },
    badges: {
      blindSpot: {
        text: (name: string) =>
          `${name}: 앞사람에 가려 객석에서 보이지 않습니다`,
        heading: "가림 확인",
        moveOut: "옆으로 비켜 얼굴을 보이게",
        moveOutNote: "가장 적게 움직이는 쪽으로. 실행 취소로 되돌아갑니다",
        body: "객석에서 볼 때 앞사람 바로 뒤에 선 사람에게 표시됩니다. 지금 화면에 보이는 대형만 보고, 이동 중은 세지 않습니다.",
      },
      collision: {
        text: (name: string, seconds: string, other: string) =>
          `${name}: 출발 후 약 ${seconds}초 뒤에 ${other}와(과) 부딪힙니다`,
        heading: "충돌 위험",
        body: "동선이 교차하는 것만으로는 표시되지 않습니다. 실제로 같은 시각에 같은 자리에 오는 두 사람에게만 표시됩니다. 한쪽 출발을 늦추거나 동선을 구부려 주세요.",
      },
      excessiveMove: {
        text: (name: string, meters: string, seconds: number, speed: string) =>
          `${name}: 다음 장면까지 약 ${meters}m를 ${seconds}초에. 약 ${speed}m/s는 뛰어야 합니다`,
        heading: "이동이 너무 빠릅니다",
        extend: (seconds: number) => `${seconds}초로 늘리기`,
        extendNote: "이후 장면도 함께 뒤로 밀립니다. 실행 취소로 되돌아갑니다",
        body: "다음 장면까지의 거리와 초에서 계산한 속도입니다. 걸어서 갈 수 있는 속도를 넘었습니다. 타임라인에서 이 장면을 오른쪽으로 끌면 이동에 쓸 시간이 늘어납니다.",
      },
    },
  },

  settings: {
    title: "설정",

    scope: {
      project: "여기서 바꾼 것은 이 작품에만 적용됩니다.",
      home: "여기서 바꾼 것은 모든 작품에 적용됩니다.",
      newProjectOnly:
        "「재생」의 기본 속도만 앞으로 만들 작품의 초기값입니다(지금 열려 있는 작품의 속도는 바뀌지 않습니다).",
      hasOverride: (n: number) => `이 작품에만 적용된 설정이 ${n}개 있습니다`,
      clear: "이 작품만의 설정 그만두기",
      cleared: "이 작품만의 설정을 지웠습니다",
    },

    projectStage: {
      description: "이 작품만의 크기입니다. 1칸 = 90cm",
      floor: (width: number, height: number) =>
        `${width}x${height} 칸보다 좁히면 들어가지 않는 사람은 가장 가까운 끝으로 옮겨집니다. 1칸 = 90cm`,
      moved: (count: number) =>
        `${count}명을 끝으로 옮겼습니다. 되돌리기로 되돌릴 수 있습니다`,
      failed: "스테이지 크기를 저장할 수 없었습니다",
    },
    stage: {
      title: "무대",
      summaryInProject: "이 작품의 무대 크기",
      description:
        "방향을 바꿔도 저장된 위치는 움직이지 않습니다. 그리는 방향과 안내 문구만 바뀝니다.",
      audienceOnTop: {
        label: "객석을 위로",
        description:
          "기본값은 위쪽이 무대 뒤입니다. 연습실에서 거울을 보며 짤 때 바꿔 주세요.",
      },
      width: "무대 너비",
      depth: "무대 깊이",
      depthDescription:
        "한 칸은 90cm입니다. 여기서 정하는 것은 앞으로 만들 작품의 크기입니다.",
      unit: "칸",
    },

    grid: {
      title: "눈금",
      summary: "센터 라인",
      centerLine: {
        label: "센터 라인 강조",
        description: "가운데(0번 줄)를 눈에 띄게 합니다.",
      },
    },

    playback: {
      title: "재생",
      summary: "카운트인 · 기본 속도 · 장면 간격",
      countIn: {
        label: "카운트인",
        description:
          "재생을 누른 뒤 실제로 움직이기까지 울리는 박입니다. 남은 수는 화면 한가운데에 표시됩니다. 음악이 없는 작품에서는 '클릭 소리'가 켜져 있으면 센 뒤에도 박이 이어집니다(음악이 있으면 음악만 재생됩니다).",
        off: "없음",
        beats: (n: number) => `${n}박`,
      },
      bpm: {
        label: "기본 템포",
        description:
          "음악이 없을 때의 기준입니다. 앞으로 만들 작품에 적용됩니다.",
        unit: "BPM",
      },
      segment: {
        label: "장면 간격",
        description:
          "장면을 추가할 때 지금 위치에서 몇 초 뒤에 놓을지 정합니다. 120BPM이면 4초가 여덟 박입니다.",
        unit: "초",
      },
    },

    display: {
      title: "표시",
      summary: "객석 방향 · 이름 · 이동선 · 바닥 표시 · 가림",
      description:
        "이동선 · 가림 확인 · 바닥 표시는 편집 화면의 메뉴와 같은 스위치입니다. 어느 쪽에서 바꿔도 같은 상태를 가리킵니다.",
      dancerName: {
        label: "댄서 이름",
        description:
          "인원이 많으면 이름으로 가득 찹니다. 선택했을 때만 보이게 하면 대형이 잘 읽힙니다.",
        always: "항상",
        selected: "선택했을 때",
        never: "표시 안 함",
      },
      path: {
        label: "동선",
        description: "다음 장면으로 가는 움직임을 선으로 그립니다.",
      },
      stageMarks: {
        label: "바닥 표시",
        description: "모든 장면의 위치를 바닥 표시로 겹쳐 보여 줍니다.",
      },
    },

    warnings: {
      title: "경고",
      summary: "가림・충돌・너무 빠른 이동",
      description:
        "무대 위 댄서에게 붙는 표시입니다. 꺼도 AI 총평과 어시스트 제안은 지금까지와 같이 확인합니다.",
      blindSpot: {
        label: "가림",
        description:
          "앞사람 바로 뒤에 서서 객석에서 보이지 않는 사람을 표시합니다.",
      },
      collision: {
        label: "충돌",
        description: "이동 중에 부딪히는 조합에 표시를 붙입니다.",
      },
      moveStrain: {
        label: "너무 빠른 이동",
        description: "걸어서는 늦는 속도의 이동에 표시를 붙입니다.",
      },
    },

    shortcuts: {
      title: "키보드 조작",
      summary: "키와 마우스로 할 수 있는 것",
    },
    app: {
      title: "앱",
      summary: "언어 · 화면 모양 · 자동 저장",
      description:
        "'밝게'는 종이 대형도 같은 화면이 됩니다. 자세히 고르려면 홈의 팔레트에서 선택하세요.",
      autoSave: {
        label: "자동 저장",
        description:
          "끄면 헤더의 저장을 누를 때까지 변경 사항이 전송되지 않습니다.",
        failed: "저장하지 못했습니다",
      },
    },

    data: {
      title: "데이터",
      summary: "내보내기 · 가져오기 · 내용 전부 지우기",
      description:
        "음악은 포함되지 않습니다(음원은 이 기기 밖으로 나가지 않습니다). 가져오기는 지금 작품을 덮어쓰지 않고 별도의 작품으로 만듭니다.",
      export: {
        label: "이 작품 내보내기",
        description: "JSON 파일로 기기에 저장합니다.",
      },
      import: "파일에서 가져오기",
      reset: {
        label: "이 작품의 내용 전부 지우기",
        description: "장면과 댄서를 모두 삭제합니다. 작품 자체는 남습니다.",
      },
    },

    account: {
      title: "계정",
      summary: "다른 계정으로 로그인 · 로그아웃 · 설정 되돌리기",
      summaryGuest: "로그인 · 설정 되돌리기",
      switch: {
        label: "다른 계정으로 로그인",
        description: "지금 계정에서 로그아웃하고 로그인 화면으로 이동합니다.",
        confirmTitle: "다른 계정으로 로그인할까요?",
        confirmDescription:
          "지금 계정에서 먼저 로그아웃합니다. 작품은 계정에 연결되어 있어 다른 계정에서는 보이지 않습니다.",
        confirmLabel: "로그아웃하고 이동",
      },
      signOut: "로그아웃",
      signInGuest: {
        label: "로그인 / 회원가입",
        description:
          "지금의 초안은 이 기기에 남습니다. 로그인하면 작품으로 저장할 수 있습니다",
      },
      resetSettings: {
        label: "설정 초기화",
        description: "이 화면의 선택만 되돌립니다. 작품은 건드리지 않습니다.",
      },
    },
  },
} satisfies Messages;
