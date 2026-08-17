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
    leftOver: (n: number) => `남는 ${n}명은 지금 위치에 그대로 있습니다(사라지지 않습니다).`,
    emptySpots: (n: number) => `${n}자리가 비게 됩니다(앞줄부터 채웁니다).`,
    title: "포메이션",
    needsTwo: "2명 이상",
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
    textureNote: "바탕 위에 옅게 겹치는 장식입니다. 무대 안에는 적용되지 않습니다.",
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
    addDancer: "댄서 추가",
    projectName: "작품 이름",
    projectNameFailed: "작품 이름을 바꾸지 못했습니다",
    upstage: "무대 뒤",
    downstage: "객석 쪽",
    noScenes: "장면이 없습니다",
    noScenesYet: "아직 장면이 없습니다",
    createFirstScene: "첫 장면 만들기",
    copyCurrent: "지금 배치를 복사해서 추가",

    view: {
      title: "표시와 모드",
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
      stageMarks: {
        label: "바닥 표시",
        description: "모든 장면의 위치를 바닥에 겹쳐 보여 줍니다",
      },
      swipe: {
        label: "밀어서 장면 넘기기",
        description: "무대를 끌면 앞뒤 장면으로(휴대폰은 옆으로, PC는 위아래로)",
      },
      thisProject: "이 작품",
      music: "음악",
      share: "공유",
      review: "대형 봐 달라고 하기",
      exportVideo: "영상으로 만들기",
      tour: "튜토리얼 시작하기",
      settings: "설정",
    },

    dock: {
      openScenes: "장면 목록 열기",
      cancelCountIn: "카운트인 취소",
      pause: "정지",
      play: "마지막 장면까지 재생",
      sceneSettings: (name: string) => `'${name}' 설정 열기`,
      moveSeconds: (seconds: number) => ` · ${seconds}초 동안 이동`,
      addScene: "장면 추가",
      hideTimeline: "시간축 접기",
      showTimeline: "시간축 펼치기",
      playFromHere: "지금 보고 있는 장면부터 재생",
      playFrom: (name: string) => `'${name}'부터 재생(지난번에 시작한 곳)`,
    },

    scenes: {
      timeInSong: "음악에서의 위치",
      ripple: "이후 장면도 함께 옮기기",
      rippleNote:
        "끄면 이 장면만 움직입니다(옆 장면을 넘어서면 순서도 바뀝니다).",
      seconds: "초",
      title: "장면",
      dancers: "댄서",
      sceneName: "장면 이름",
      summary: (count: number, seconds: number) =>
        `${count}개 · 합계 ${seconds}s`,
      moveIn: (seconds: number) => ` · ${seconds}s 동안 이동`,
      showing: " · 보는 중",
      duplicate: "복제",
      delete: "삭제",
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
      undoHint: "실행 취소 (Ctrl+Z)",
      redo: "다시 실행",
      redoHint: "다시 실행 (Ctrl+Shift+Z)",
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

    errors: {
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
    travelFromPrevious: (seconds: string) =>
      `앞 장면에서 ${seconds}초 동안 이동`,
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
    haveAccount: "이미 계정이 있으시면 ",
    noAccount: "계정이 없으시면 ",
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
    draftHere: "지금 만들고 있는 작품은 이 기기 안에만 있습니다.",
    draftSaved: "가입하면 그대로 저장됩니다.",
    draftPending:
      "확인이 끝날 때까지 작품은 저장되지 않습니다. 이 탭을 닫지 말고 메일의 링크를 연 뒤 돌아와 주세요.",
  },

  welcome: {
    tagline: "연습실에서 나눠 주는 대형도를, 곡에 맞춰 움직이는 형태로.",
    guestStart: "게스트로 시작하기",
    withTour: "사용법 안내부터 시작하기",
    tourAsk: {
      title: "사용법 안내를 볼까요?",
      body: "무대·댄서·장면 세 가지를 실제 화면을 짚어 가며 1분 정도 안내합니다.",
      withTour: "안내부터 시작하기",
    },
    guestNote: "가입하지 않아도 됩니다. 만든 것은 이 기기에만 남습니다.",
    or: "또는",
  },

  projects: {
    cardSummary: (scenes: number, dancers: number) =>
      `${scenes}장면 · ${dancers}명`,
    count: (n: number) => `작품 ${n}개`,
    empty: "아직 작품이 없습니다.",
    emptyHint: "위 입력란에 곡 이름을 넣으면 무대가 하나 만들어집니다.",
    newName: "새 작품 이름",
    create: "작품 만들기",
    createFailed: "작품을 만들지 못했습니다",
    renamedForClash: (title: string) =>
      `같은 이름이 있어서 '${title}'으로 만들었습니다`,
    tapToStart: "눌러서 첫 장면 만들기",
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
    cancel: "취소",
    deleting: "삭제 중...",
    delete: "삭제하기",
  },

  tour: {
    stageTitle: "여기가 무대입니다",
    stageBody:
      "위가 무대 뒤, 아래가 객석 쪽입니다. 동그라미가 댄서이고, 잡아서 옮길 수 있습니다. 아래 눈금은 센터에서의 거리입니다.",
    timelineTitle: "가로 위치가 곡의 시간입니다",
    timelineBody:
      "각 컷은 '곡의 몇 초의 대형인지'의 위치에 놓입니다. 컷을 옆으로 끌면 그 시각이 움직이고, 간격이 그대로 이동에 쓸 수 있는 시간이 됩니다.",
    addTitle: "대형 추가하기",
    addBody:
      "지금 듣고 있는 위치에, 지금 배치를 복사한 대형을 만듭니다. 만들고 나서 옮기는 것이 기본 흐름입니다.",
    viewTitle: "보이는 방식 바꾸기",
    viewBody:
      "동선·격자·가림 경고 같은 전환과 화면 모양 변경이 여기 있습니다. 이 안내를 다시 보는 것도 여기서 할 수 있습니다.",
    back: "뒤로",
    close: "닫기",
    last: "시작하기",
    next: "다음",
    nextWithProgress: "다음（{current}/{total}）",
    skip: "skip",
  },

  offline: {
    title: "오프라인 — Choreon",
    heading: "지금 연결이 되지 않습니다",
    body: "한 번 열었던 화면은 그대로 볼 수 있습니다. 이전 화면으로 돌아가거나, 연결이 돌아온 뒤 다시 열어 주세요.",
    toProjects: "작품 목록으로",
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
      title: (name: string) => `${name}의 동선`,
      me: "나",
      everyone: "전체",
      all: "전부",
      summary: (scenes: number, total: string) =>
        `${scenes}장면 · 전체 ${total}`,
      lastFormation: "여기가 마지막 대형입니다",
      stepsNote: "걸음 수는 한 걸음 60cm·한 칸 90cm로 계산한 어림값입니다.",
      sidesNote: "상수／하수는 객석에서 본 방향입니다.",
      fast: " — 빠름",
      hereNow: " · 지금 여기",
      tooFast: "걸어서는 갈 수 없는 속도입니다",
      reselect: "포지션 다시 고르기",
      play: "통으로 재생",
      stop: "정지",
      paths: "동선",
    },
    entry: {
      question: "본인은 누구인가요?",
      note: "고르면 그 사람만 진하게 나오고 동선도 표시됩니다. 나중에 바꿀 수 있습니다.",
      position: (name: string) => `${name}의 위치`,
      pick: "본인을 골라 주세요",
      pickNamed: (name: string) => `'${name}'(으)로 보기`,
      skip: "고르지 않고 전체 보기",
    },
    music: {
      pickSame: "같은 곡을 이 기기에서 고르기",
    },
  },

  share: {
    title: "공유",
    enable: "링크를 아는 사람이 볼 수 있음",
    resume: "이 링크로 다시 공유하기",
    stop: "공유 그만두기",
    enabledNote: "지금 공유 중입니다. 링크를 연 사람에게는 보기 전용 화면이 열립니다",
    disabledNote: "지금은 공유하고 있지 않습니다. 링크를 가진 사람도 열 수 없습니다",
    noKey:
      "이 작품에는 아직 공유용 키가 없습니다. Supabase SQL Editor에서 supabase/schema.sql 을 실행하면 사용할 수 있습니다.",
    everyone: "모두에게 줄 링크",
    copy: "링크 복사",
    copied: "복사했습니다",
    perDancer: "한 사람씩 줄 링크",
    perDancerNote:
      "열면 그 사람이 선택된 상태로 시작합니다. 볼 수 있는 범위는 같고, 다른 사람의 동선도 볼 수 있습니다.",
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
      "곡은 따라가지 않습니다(음원이 이 기기 밖으로 나가지 않기 때문입니다). 시작 위치는 공유되니 같은 곡만 골라 주면 위치가 맞습니다.",
    sharing: "공유 중. 링크 열기",
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
      busy: "의견 기능이 혼잡합니다. 잠시 기다린 뒤 다시 시도해 주세요",
      tooSlow: "의견을 받는 데 너무 오래 걸렸습니다. 다시 시도해 주세요",
      empty: "의견이 비어 있었습니다. 다시 시도해 주세요",
    },
    title: "대형 봐 달라고 하기",
    note: "지금 열려 있는 장면의 위치만 보냅니다. 작품 이름과 댄서의 색은 보내지 않습니다. 돌아오는 것은 판정이 아니라 생각할 재료입니다.",
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
    showNamesNote: "인원이 많을 때는 끄면 대형이 잘 보입니다",
    running: (seconds: number) =>
      `내보내는 중… ${seconds}초 남았습니다. 이 화면을 닫지 말고 기다려 주세요.`,
    cancel: "중단",
    note: "내보내기는 작품과 같은 시간이 걸립니다(실제로 재생하면서 녹화하기 때문입니다).",
    contains:
      "들어가는 것: 무대·격자·댄서(방향 삼각형 포함)·위아래 표시·시각.",
    omits:
      "소리는 들어가지 않습니다(음악도 클릭도). 음악은 이 기기에만 있고 공유하지 않기로 한 것이라 영상에 굽지 않습니다.",
    includeTitle: "함께 그릴 것",
    includePathsNote: "손으로 구부린 동선도 화면과 같은 모양으로 들어갑니다",
    includeNote:
      "모두 기본은 꺼져 있습니다. 화면에 나와 있어도 여기서 고른 것만 영상에 들어갑니다.",
    saved: "영상을 저장했습니다",
    failed: "내보내지 못했습니다",
  },

  music: {
    title: "음악",
    pick: "기기에서 곡 고르기",
    pickAnother: "다른 곡 고르기",
    file: "음악 파일",
    remove: "곡 빼기",
    keptOnDevice: "이 기기에 보관해 둡니다. 다시 열어도 그대로 있습니다.",
    notShared:
      "음원은 이 기기 밖으로 나가지 않습니다. 작품을 공유해도 곡은 따라가지 않으니 상대에게 같은 곡을 고르라고 알려 주세요(시작 위치는 공유됩니다).",
    metronomeTitle: "곡이 없을 때의 박",
    metronomeNote:
      "곡을 준비하기 전에도 안무의 속도를 귀로 확인할 수 있습니다. 재생 중에만 소리가 납니다.",
    metronome: "메트로놈",
    click: "클릭음 켜기",
    clickWithMusic: "음악이 있을 때는 클릭이 울리지 않습니다(음악에 맞추기 때문)",
    bpm: "속도(BPM)",
    beatsPerBar: "박자",
    beatsPerBarNote:
      "세는 단위(여덟 박)는 박자로 바뀌지 않습니다. 여기서 바뀌는 것은 메트로놈에서 세게 울리는 박과 타임라인에 굵게 그리는 선뿐입니다.",
    offset: "곡의 시작 위치",
    seconds: "초",
    offsetNote:
      "안무가 곡 중간부터 시작할 때 사용합니다. 인트로가 12.5초라면 12.5를 넣으면 재생 버튼으로 거기서부터 나옵니다.",
    offsetFailed: "곡의 시작 위치를 저장하지 못했습니다",
    span: (total: number, from: string, to: string) =>
      `전체 ${total}초 · ${from} ~ ${to}`,
    counts: (set: number, count: number) => `${set}세트 ${count}카운트`,
    zoomIn: "타임라인 확대",
    zoomOut: "타임라인 축소",
    pxPerSecond: "px/초",
    stacked: (from: number, to: number) =>
      `장면 ${from}~${to}이(가) 겹쳐 있습니다. 누르면 펼쳐서 하나씩 고를 수 있습니다`,
    scenesShort: "장면",
  },

  dancer: {
    add: {
      title: "댄서 추가",
      howMany: "몇 명 추가할까요?",
      minus: "한 명 줄이기",
      plus: "한 명 늘리기",
      count: "추가할 인원",
      people: "명",
      autoNote: "이름과 색은 자동으로 정해집니다(나중에 바꿀 수 있습니다)",
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
      empty: "이 장면에는 아직 아무도 없습니다.",
    },
    inspector: {
      name: "댄서 이름",
      ownDuration: "이 댄서만의 이동 시간(초)",
      seconds: "초",
      focus: "마이 포커스",
      focusOn: "마이 포커스 중",
      remove: "댄서 삭제",
      deselect: "선택 해제",
      changeColor: (color: string) => `색을 ${color}(으)로 바꾸기`,
      rotate: "방향 바꾸기",
      curve: (name: string) => `${name}의 곡선 모양 조정`,
      deleteTitle: (name: string) => `'${name}'을(를) 삭제할까요?`,
      deleteDescription:
        "이 댄서의 위치와 동선이 모든 장면에서 사라집니다. 삭제는 되돌릴 수 없습니다(이동과 방향은 되돌릴 수 있습니다).",
      deleteMeta: (scenes: number) => `${scenes}개 장면의 위치`,
      durationFailed: "이동 시간을 바꾸지 못했습니다",
      nameFailed: "댄서 이름을 바꾸지 못했습니다",
      colorFailed: "색을 바꾸지 못했습니다",
      deleteFailed: "댄서를 삭제하지 못했습니다",
    },
    badges: {
      blindSpot: {
        text: (name: string) => `${name}: 앞사람에 가려 객석에서 보이지 않습니다`,
        heading: "가림 확인",
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
      newProjectOnly: "무대 크기와 기본 속도는 앞으로 만들 작품의 초기값입니다.",
      hasOverride: (n: number) => `이 작품에만 적용된 설정이 ${n}개 있습니다`,
      clear: "이 작품만의 설정 그만두기",
      cleared: "이 작품만의 설정을 지웠습니다",
    },

    stage: {
      title: "무대",
      summary: "객석 방향 · 새 작품의 크기",
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
      summary: "격자 흡착 · 센터 라인",
      snap: {
        label: "격자에 붙이기",
        description: "끄면 어디에나 놓을 수 있습니다.",
      },
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
        description: "재생을 누른 뒤 실제로 움직이기까지 울리는 박입니다. 남은 수는 화면 한가운데에 표시됩니다. 음악이 없는 작품에서는 '클릭 소리'가 켜져 있으면 센 뒤에도 박이 이어집니다(음악이 있으면 음악만 재생됩니다).",
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
      summary: "이름 · 이동선 · 바닥 표시 · 가림 · 스와이프",
      description:
        "아래 네 가지는 편집 화면의 '표시와 모드'와 같은 스위치입니다. 어느 쪽에서 바꿔도 같은 상태를 가리킵니다.",
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
      blindSpot: {
        label: "가림 확인",
        description:
          "앞사람 바로 뒤에 서서 객석에서 보이지 않는 사람을 표시합니다.",
      },
      swipe: {
        label: "밀어서 장면 넘기기",
        description: "무대를 쓸면 앞뒤 장면으로 넘어갑니다(휴대폰은 옆으로, PC는 위아래로).",
      },
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
      switch: {
        label: "다른 계정으로 로그인",
        description: "지금 계정에서 로그아웃하고 로그인 화면으로 이동합니다.",
        confirmTitle: "다른 계정으로 로그인할까요?",
        confirmDescription:
          "지금 계정에서 먼저 로그아웃합니다. 작품은 계정에 연결되어 있어 다른 계정에서는 보이지 않습니다.",
        confirmLabel: "로그아웃하고 이동",
      },
      signOut: "로그아웃",
      resetSettings: {
        label: "설정 초기화",
        description:
          "이 화면의 선택만 되돌립니다. 작품은 건드리지 않습니다.",
      },
    },
  },
} satisfies Messages;
