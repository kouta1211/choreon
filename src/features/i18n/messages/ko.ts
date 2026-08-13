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
  },

  themes: {
    midnight: "미드나이트 핑크",
    neon: "네온 시안",
    amber: "앰버 스테이지",
    mono: "모노크롬",
    chalk: "칠판＋분필",
    paper: "종이 대형도",
    gridnote: "모눈 노트＋파란 잉크",
    kraft: "크라프트지＋활판",
    tracing: "트레이싱지",
    whiteboard: "화이트보드＋마커",
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
        description: "무대를 옆으로 끌면 앞뒤 장면으로",
      },
      thisProject: "이 작품",
      music: "음악",
      share: "공유",
      review: "대형 봐 달라고 하기",
      exportVideo: "영상으로 만들기",
      tour: "사용법 다시 보기",
      settings: "설정",
      override: {
        label: "이 작품만 다른 화면 모양",
        on: "홈에서 테마를 바꿔도 여기는 바뀌지 않습니다",
        off: "켜면 지금 화면 모양을 이 작품에 고정합니다",
      },
    },

    dock: {
      openScenes: "장면 목록 열기",
      cancelCountIn: "카운트인 취소",
      pause: "정지",
      play: "마지막 장면까지 재생",
      sceneSettings: (name: string) => `'${name}' 설정 열기`,
      moveSeconds: (seconds: number) => ` · ${seconds}초 동안 이동`,
      addScene: "장면 추가",
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
        body: "다음 장면까지의 거리와 초에서 계산한 속도입니다. 걸어서 갈 수 있는 속도를 넘었습니다. 타임라인에서 이 장면을 오른쪽으로 끌면 이동에 쓸 시간이 늘어납니다.",
      },
    },
  },

  settings: {
    title: "설정",

    stage: {
      title: "무대",
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
      interval: {
        label: "격자 간격",
        description:
          "인원이 많으면 격자가 너무 촘촘해서 점이 묻힙니다. 간격을 넓히면 대형만 남습니다.",
        squares: (n: number) => `${n}칸`,
      },
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
      countIn: {
        label: "카운트인",
        description: "재생을 누른 뒤 실제로 움직이기까지 울리는 박입니다.",
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
        description: "무대를 옆으로 쓸면 앞뒤 장면으로 넘어갑니다.",
      },
    },

    app: {
      title: "앱",
      description:
        "'밝게'는 종이 대형도 같은 화면이 됩니다. 자세히 고르려면 홈의 팔레트에서 선택하세요.",
      colorScheme: {
        label: "화면 모드",
        dark: "어둡게",
        light: "밝게",
        system: "기기 설정",
      },
      autoSave: {
        label: "자동 저장",
        description:
          "끄면 헤더의 저장을 누를 때까지 변경 사항이 전송되지 않습니다.",
        failed: "저장하지 못했습니다",
      },
    },

    data: {
      title: "데이터",
      description:
        "음악은 포함되지 않습니다(음원은 이 기기 밖으로 나가지 않습니다). 가져오기는 지금 작품을 덮어쓰지 않고 별도의 작품으로 만듭니다.",
      export: {
        label: "이 작품 내보내기",
        description: "JSON 파일로 기기에 저장합니다.",
      },
      import: "파일에서 가져오기",
      reset: {
        label: "이 작품 비우기",
        description: "장면과 댄서를 모두 삭제합니다.",
      },
    },

    account: {
      title: "계정",
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
