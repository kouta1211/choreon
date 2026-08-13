/**
 * 画面に出す言葉。**日本語がこの辞書の正**。
 *
 * ここに書いた形がそのまま型になり(`type Messages = typeof ja`)、
 * 英語と韓国語はそれを満たすことを型で強制される。
 * **訳し忘れ・綴り間違いは `npm run verify` の tsc で落ちる**ので、
 * 実行時にキーがそのまま画面へ出ることが起こらない。
 *
 * 引くときはキーの文字列ではなくプロパティを辿る
 * (`t.settings.stage.audienceOnTop.label`)。補完が効き、
 * i18n のライブラリを足さずに済む。
 *
 * 数や名前が混ざる文は関数で持つ。文の途中で切って連結すると、
 * 語順の違う言語で組み立て直せなくなる。
 */
export const ja = {
  language: {
    label: "言語",
    description: "この端末で覚えます",
  },

  settings: {
    title: "設定",

    stage: {
      title: "舞台",
      description:
        "向きを変えても、保存されている立ち位置は動きません。描く向きと、道順の言葉づかいだけが入れ替わります。",
      audienceOnTop: {
        label: "客席を上にする",
        description:
          "既定は上がバックステージ。稽古場で鏡を見ながら組むときに入れ替える",
      },
      width: "ステージの幅",
      depth: "ステージの奥行き",
      depthDescription:
        "1マス = 90cm。ここで決めるのは、これから作る作品の広さです",
      unit: "マス",
    },

    grid: {
      title: "目盛り",
      interval: {
        label: "格子の間隔",
        description: "人数が多いと格子が細かすぎて点が沈む。間引くと隊形だけが残る",
        squares: (n: number) => `${n}マス`,
      },
      snap: {
        label: "格子に吸着させる",
        description: "切ると、どこにでも置けます",
      },
      centerLine: {
        label: "センターラインを強調",
        description: "中央(0の列)を目立たせます",
      },
    },

    playback: {
      title: "再生",
      countIn: {
        label: "カウントイン",
        description: "再生を押してから、実際に動き出すまでに鳴らす拍",
        off: "なし",
        beats: (n: number) => `${n}拍`,
      },
      bpm: {
        label: "既定の速さ",
        description: "曲を入れていないときの物差し。新しく作る作品に入ります",
        unit: "BPM",
      },
      segment: {
        label: "シーンの間隔",
        description:
          "シーンを足したとき、いまの位置から何秒後に置くか。120BPMなら4秒が1つの8カウント",
        unit: "秒",
      },
    },

    display: {
      title: "表示",
      description:
        "下の4つは、エディタの「表示とモード」と同じスイッチです。どちらから変えても同じ状態を指します。",
      dancerName: {
        label: "ダンサー名",
        description: "人数が多いと名前で埋まる。選択時だけにすると隊形が読みやすい",
        always: "常に",
        selected: "選択時",
        never: "出さない",
      },
      path: {
        label: "導線",
        description: "次のシーンへの動きを線で描きます",
      },
      stageMarks: {
        label: "バミリ",
        description: "全シーンの立ち位置を、床の印として重ねます",
      },
      blindSpot: {
        label: "顔被りチェック",
        description: "手前の人の真後ろに入って、客席から見えない人に印を付けます",
      },
      swipe: {
        label: "払ってシーンを送る",
        description: "ステージを横になぞると、前後のシーンへ移ります",
      },
    },

    app: {
      title: "アプリ",
      description:
        "「明るい」は紙の隊形図の見た目になります。細かく選ぶときはホームのパレットから。",
      colorScheme: {
        label: "見た目",
        dark: "暗い",
        light: "明るい",
        system: "端末",
      },
      autoSave: {
        label: "自動保存",
        description: "切ると、変更はヘッダーの保存を押すまで送られません",
        failed: "保存に失敗しました",
      },
    },

    data: {
      title: "データ",
      description:
        "曲は入りません(音源はこの端末から出ないため)。取り込みは、いまの作品を上書きせず別の作品として作ります。",
      export: {
        label: "この作品を書き出す",
        description: "JSONで手元に保存します",
      },
      import: "ファイルから取り込む",
      reset: {
        label: "この作品を空にする",
        description: "シーンとダンサーを全部消します",
      },
    },

    account: {
      title: "アカウント",
      switch: {
        label: "別のアカウントでログイン",
        description:
          "いまのアカウントからログアウトして、ログイン画面へ移ります",
        confirmTitle: "別のアカウントでログインしますか",
        confirmDescription:
          "いまのアカウントからは一度ログアウトします。作品はアカウントに紐づいているので、別のアカウントからは見えません。",
        confirmLabel: "ログアウトして移る",
      },
      signOut: "ログアウト",
      resetSettings: {
        label: "設定を既定に戻す",
        description: "この画面の選択だけを戻します。作品には触れません",
      },
    },
  },
};

export type Messages = typeof ja;
