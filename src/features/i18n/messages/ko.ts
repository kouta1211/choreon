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
