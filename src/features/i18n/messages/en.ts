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

  // 内訳は奥→手前。英語では upstage → downstage と言うので、
  // 「後1-2-2前」は "1-2-2 from upstage" になる
  formations: {
    row: "Single line",
    rowPair: "Side by side",
    rowFront: "Line, downstage",
    rowBack: "Line, upstage",
    column: "Single file",
    columnPair: "One behind the other",
    diagonal: "Diagonal",
    diagonalLine: "Diagonal line",
    lShape: "L shape",
    xShape: "X shape",
    wShape: "W (zigzag)",
    diamond: "Diamond",
    circle: "Circle",
    circleCenter: "Circle with a centre",
    arc: "Arc",
    wedgeIn: "Opening out (narrow upstage)",
    wedgeOut: "Closing in (wide upstage)",
    triangle: (rows: number[]) => `Triangle (${rows[0]} back, ${rows[1]} front)`,
    triangleDown: (rows: number[]) =>
      `Inverted triangle (${rows[0]} back, ${rows[1]} front)`,
    v: (rows: number[]) => `V (${rows.join("-")} from upstage)`,
    vDown: (rows: number[]) => `Inverted V (${rows.join("-")} from upstage)`,
    twoRows: (rows: number[]) => `Two lines (${rows.join("-")})`,
    twoColumns: (rows: number[]) => `Two files (${rows.join("-")})`,
    stagger: (rows: number[]) => `Staggered (${rows.join("-")})`,
    arcRows: (rows: number[]) => `Two arcs (${rows.join("-")})`,
    grid: (rows: number[]) => `${rows[0]}×${rows[1]} grid`,
  },

  templateSheet: {
    shapeCount: (n: number) => `${n} shapes`,
    needsTwoNotice:
      "You need two or more dancers to pick a formation. Add them from the person icon in the header.",
    castCount: (n: number) => `${n}`,
    current: "now",
    matchingCast: (n: number) => `Showing shapes for the ${n} dancers on stage`,
    forCast: (n: number) => `A shape for ${n} dancers.`,
    leftOver: (n: number) =>
      `The ${n} left over stay where they are (nobody is removed).`,
    emptySpots: (n: number) => `${n} spots stay empty (filled from the front).`,
    title: "Formations",
    needsTwo: "two or more",
    spacing: { narrow: "Tight", normal: "Normal", wide: "Wide" },
    flipX: "Flip left–right",
    flipY: "Flip front–back",
    rotate: "Rotate 90°",
    apply: "Use this shape",
    applyNamed: (name: string) => `Use ${name}`,
    applied: (name: string) => `Changed to ${name}`,
    appliedPartial: (name: string, leftOut: number) =>
      `Changed to ${name} (${leftOut} left where they were)`,
    undo: "Undo",
    failed: "Could not apply the formation",
  },

  themeSheet: {
    backToList: "Back to the list",
    textureTitle: "Background texture",
    textureNote:
      "A light overlay on the ground. It never covers the stage itself.",
    themeCount: (n: number) => `${n} themes`,
    previewMode: "Mode",
    title: "Appearance",
    all: "All",
    dark: "Dark",
    material: "Paper and material",
    selected: "Selected",
    deviceOnly: "Saved on this device only",
  },

  themes: {
    midnight: "Midnight Pink",
    neon: "Neon Cyan",
    amber: "Amber Stage",
    mono: "Monochrome",
    chalk: "Blackboard & Chalk",
    paper: "Paper Chart",
    gridnote: "Grid Notebook & Blue Ink",
    kraft: "Kraft Paper & Letterpress",
    tracing: "Tracing Paper",
    whiteboard: "Whiteboard & Marker",
  },

  themeSubtitles: {
    midnight: "Default",
    neon: "Glow and glass",
    amber: "Stage lights on boards",
    mono: "No colour in the interface",
    chalk: "Dark ground, different material",
    paper: "Cream paper, red pencil",
    gridnote: "Fountain pen, red pen",
    kraft: "Thick card, sunken type",
    tracing: "The next scene shows through",
    whiteboard: "Thick marker, strong colour",
  },

  textures: {
    flat: "Flat",
    nebula: "Nebula",
    horizon: "Cyclorama",
    spot: "Spotlight pool",
    grid: "Grid and ruler",
    grain: "Grain",
    curtain: "Blackout curtain",
  },

  editor: {
    backToProjects: "Back to your pieces",
    addDancer: "Add a dancer",
    projectName: "Piece name",
    projectNameFailed: "Could not rename the piece",
    upstage: "Upstage",
    downstage: "Downstage",
    noScenes: "No scenes yet",
    noScenesYet: "No scenes yet",
    createFirstScene: "Make the first scene",
    copyCurrent: "Copy this formation into a new scene",

    view: {
      title: "View and modes",
      counts: (dancers: number, scenes: number) =>
        `${dancers} dancers · ${scenes} scenes`,
      gridLabel: "Grid",
      gridSquare: "Squares",
      gridCircle: "Rings",
      gridNone: "None",
      path: {
        label: "Show paths",
        description: "Draws the move to the next scene as a line",
      },
      blindSpot: {
        label: "Blocked-view check",
        description: "Marks anyone standing directly behind someone",
      },
      stageMarks: {
        label: "Spike marks",
        description: "Lays every scene's positions on the floor",
      },
      swipe: {
        label: "Swipe to change scene",
        description: "Drag across the stage for the next or previous scene",
      },
      thisProject: "This piece",
      music: "Music",
      share: "Share",
      review: "Ask for notes",
      exportVideo: "Make a video",
      tour: "Show me around again",
      settings: "Settings",
      override: {
        label: "A different look for this piece only",
        on: "Changing the theme on the home screen will not change this one",
        off: "Turn on to pin the current look to this piece",
      },
    },

    dock: {
      openScenes: "Open the scene list",
      cancelCountIn: "Cancel the count-in",
      pause: "Stop",
      play: "Play to the last scene",
      sceneSettings: (name: string) => `Open the settings for “${name}”`,
      moveSeconds: (seconds: number) => ` · ${seconds}s to get there`,
      addScene: "Add a scene",
    },

    scenes: {
      timeInSong: "Position in the music",
      ripple: "Move the later scenes too",
      rippleNote:
        "With this off, only this scene moves (passing a neighbour swaps their order).",
      seconds: "s",
      title: "Scenes",
      dancers: "Dancers",
      sceneName: "Scene name",
      summary: (count: number, seconds: number) =>
        `${count} scenes · ${seconds}s in total`,
      moveIn: (seconds: number) => ` · ${seconds}s to get there`,
      showing: " · showing",
      duplicate: "Duplicate",
      delete: "Delete",
    },

    save: {
      save: "Save",
      saved: "Saved",
      failed: "Could not save",
      retry: "Try again",
      unsaved: "You have unsaved changes",
    },

    history: {
      undo: "Undo",
      undoHint: "Undo (Ctrl+Z)",
      redo: "Redo",
      redoHint: "Redo (Ctrl+Shift+Z)",
    },

    template: {
      open: "Pick a formation",
      openSame: "Pick a formation (still the same as the previous scene)",
    },

    a11y: {
      dragHelp:
        "Drag a dancer to move them. With one selected you can also use the arrow keys, and hold Shift to move further.",
      dragStart: "Started moving the dancer.",
      dragEnd: "Placed the dancer.",
      dragCancel: "Cancelled moving the dancer.",
    },

    errors: {
      position: "Could not save the position",
      rotation: "Could not save the facing",
      curve: "Could not change the curve",
      retry: "Try again",
    },
  },

  dancer: {
    add: {
      title: "Add dancers",
      howMany: "How many?",
      minus: "One fewer",
      plus: "One more",
      count: "How many to add",
      people: "dancers",
      autoNote: "Names and colours are picked for you (you can change them later)",
      spotsNote:
        "They go into the free squares in the scene you are looking at, filling outwards from the centre. Nobody overlaps, so you can drag them straight away.",
      submit: (n: number) => (n === 1 ? "Add 1 dancer" : `Add ${n} dancers`),
      cancel: "Cancel",
      addedOne: (name: string) => `Added ${name} to the stage`,
      addedMany: (n: number) => `Added ${n} dancers to the stage`,
      failed: "Could not add the dancers",
    },
    list: {
      title: "Dancers",
      empty: "Nobody is in this scene yet.",
    },
    inspector: {
      name: "Dancer name",
      ownDuration: "Travel time for this dancer only (s)",
      seconds: "s",
      focus: "Focus on me",
      focusOn: "Focused",
      remove: "Delete this dancer",
      deselect: "Deselect",
      changeColor: (color: string) => `Change the colour to ${color}`,
      rotate: "Change the facing",
      curve: (name: string) => `Adjust the curve for ${name}`,
      deleteTitle: (name: string) => `Delete “${name}”?`,
      deleteDescription:
        "Their position and paths disappear from every scene. Deleting cannot be undone (moves and facings can be).",
      deleteMeta: (scenes: number) => `positions in ${scenes} scenes`,
      durationFailed: "Could not change the travel time",
      nameFailed: "Could not rename the dancer",
      colorFailed: "Could not change the colour",
      deleteFailed: "Could not delete the dancer",
    },
    badges: {
      blindSpot: {
        text: (name: string) =>
          `${name}: hidden behind someone, out of sight from the audience`,
        heading: "Blocked-view check",
        body: "Marks anyone standing directly behind someone as seen from the audience. It only looks at the formation on screen, not at what happens mid-move.",
      },
      collision: {
        text: (name: string, seconds: string, other: string) =>
          `${name}: runs into ${other} about ${seconds}s after setting off`,
        heading: "They will collide",
        body: "Crossing paths alone does not trigger this. It marks two dancers who actually reach the same place at the same moment. Delay one of them, or bend a path.",
      },
      excessiveMove: {
        text: (name: string, meters: string, seconds: number, speed: string) =>
          `${name}: about ${meters}m in ${seconds}s. ${speed}m/s means running`,
        heading: "Too fast to walk",
        body: "The speed comes from the distance and the seconds to the next scene, and it is faster than walking. Drag this scene to the right on the timeline to give the move more time.",
      },
    },
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
