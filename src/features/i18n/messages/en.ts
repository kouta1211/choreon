import type { Messages } from "@/features/i18n/messages/ja";

/**
 * 英語。舞台の用語は舞台の言い方に寄せている
 * (バックステージ = upstage、客席側 = downstage、バミリ = spike marks)。
 *
 * `satisfies` を付けてあるので、キーが欠けると tsc が落ちる。
 */
export const en = {
  language: {
    label: "Language",
    description: "Remembered on this device",
  },

  settings: {
    title: "Settings",

    stage: {
      title: "Stage",
      description:
        "Flipping the view never moves a saved position. Only the direction things are drawn, and the words used for it, swap over.",
      audienceOnTop: {
        label: "Put the audience at the top",
        description:
          "Upstage is at the top by default. Flip it when you are building in front of a mirror.",
      },
      width: "Stage width",
      depth: "Stage depth",
      depthDescription:
        "One square is 90 cm. This sets the size of the pieces you make from now on.",
      unit: "squares",
    },

    grid: {
      title: "Grid",
      interval: {
        label: "Grid spacing",
        description:
          "With a large cast the lines get so fine that the dancers sink into them. Thin them out and only the formation is left.",
        squares: (n: number) => (n === 1 ? "1 sq" : `${n} sq`),
      },
      snap: {
        label: "Snap to the grid",
        description: "Turn it off to place anyone anywhere.",
      },
      centerLine: {
        label: "Emphasise the centre line",
        description: "Makes the centre (column 0) stand out.",
      },
    },

    playback: {
      title: "Playback",
      countIn: {
        label: "Count-in",
        description:
          "Beats to sound after you press play, before anything starts moving.",
        off: "Off",
        beats: (n: number) => `${n} beats`,
      },
      bpm: {
        label: "Default tempo",
        description:
          "The measure used when there is no music. It goes into the pieces you make from now on.",
        unit: "BPM",
      },
      segment: {
        label: "Scene spacing",
        description:
          "How many seconds after the current position a new scene is placed. At 120 BPM, four seconds is one eight-count.",
        unit: "s",
      },
    },

    display: {
      title: "Display",
      description:
        "The four below are the same switches as in the editor's View and modes. Either way in points at the same state.",
      dancerName: {
        label: "Dancer names",
        description:
          "With a large cast the names fill the floor. Showing them only for the selected dancer keeps the formation readable.",
        always: "Always",
        selected: "When selected",
        never: "Never",
      },
      path: {
        label: "Paths",
        description: "Draws the move to the next scene as a line.",
      },
      stageMarks: {
        label: "Spike marks",
        description: "Lays every scene's positions on the floor as marks.",
      },
      blindSpot: {
        label: "Blocked-view check",
        description:
          "Marks anyone standing directly behind someone, out of sight from the audience.",
      },
      swipe: {
        label: "Swipe to change scene",
        description: "Drag across the stage to move to the next or previous scene.",
      },
    },

    app: {
      title: "App",
      description:
        "Light gives you the look of a paper chart. For a finer choice, use the palette on the home screen.",
      colorScheme: {
        label: "Appearance",
        dark: "Dark",
        light: "Light",
        system: "System",
      },
      autoSave: {
        label: "Autosave",
        description:
          "Turn it off and nothing is sent until you press Save in the header.",
        failed: "Could not save",
      },
    },

    data: {
      title: "Data",
      description:
        "Music is not included — the audio never leaves this device. Importing makes a separate piece rather than overwriting this one.",
      export: {
        label: "Export this piece",
        description: "Saves it to your device as JSON.",
      },
      import: "Import from a file",
      reset: {
        label: "Empty this piece",
        description: "Deletes every scene and every dancer.",
      },
    },

    account: {
      title: "Account",
      switch: {
        label: "Sign in with another account",
        description: "Signs out of this account and goes to the sign-in screen.",
        confirmTitle: "Sign in with another account?",
        confirmDescription:
          "You will be signed out of this account first. Pieces belong to the account that made them, so another account will not see them.",
        confirmLabel: "Sign out and continue",
      },
      signOut: "Sign out",
      resetSettings: {
        label: "Reset settings",
        description:
          "Restores only the choices on this screen. Your pieces are untouched.",
      },
    },
  },
} satisfies Messages;
