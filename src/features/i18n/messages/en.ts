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
    apply: "Use this look",
  },

  themes: {
    midnight: "Midnight Pink",
    neon: "Neon Cyan",
    amber: "Amber Stage",
    mono: "Monochrome",
    chalk: "Chalkboard",
    paper: "Cream Paper",
    gridnote: "Graph Note",
    kraft: "Kraft Press",
    tracing: "Tracing Sheet",
    whiteboard: "Marker Board",
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
        description: "Drag the stage for the next or previous scene (sideways on phones, up and down on desktop)",
      },
      thisProject: "This piece",
      music: "Music",
      share: "Share",
      review: "Ask for notes",
      exportVideo: "Make a video",
      tour: "Start the tutorial",
      settings: "Settings",
    },

    dock: {
      openScenes: "Open the scene list",
      cancelCountIn: "Cancel the count-in",
      pause: "Stop",
      play: "Play to the last scene",
      sceneSettings: (name: string) => `Open the settings for “${name}”`,
      moveSeconds: (seconds: number) => ` · ${seconds}s to get there`,
      addScene: "Add a scene",
      hideTimeline: "Collapse the timeline",
      showTimeline: "Show the timeline",
      playFromHere: "Play from the scene you are on",
      playFrom: (name: string) => `Play from "${name}" (where you started last time)`,
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

  common: {
    close: "Close",
    numberField: {
      notANumber: "Please enter a number",
      tooSmall: (min: number) => `Cannot go below ${min}`,
      tooLarge: (max: number) => `Cannot go above ${max}`,
    },
    back: "Back",
    loading: "Loading",
    rename: (label: string) => `Change the ${label}`,
    saveToCloud: "Save",
    settings: "Settings",
    appearance: "Change the look",
    undoFailed: "Could not undo",
    redoFailed: "Could not redo",
    undoTargetGone: "Could not undo — what it applied to has been deleted",
    travelFromPrevious: (seconds: string) =>
      `${seconds}s from the previous scene`,
  },

  app: {
    description: "Dance formations, made on your phone",
    ogLocale: "en_US",
  },

  auth: {
    signIn: "Sign in",
    signUp: "Create an account",
    createAccount: "Create an account",
    email: "Email address",
    password: "Password",
    passwordSignUp: "Password (6 characters or more)",
    signingIn: "Signing in…",
    signingUp: "Creating…",
    submitSignUp: "Create the account",
    haveAccount: "Already have an account? ",
    noAccount: "No account yet? ",
    wrongCredentials: "That email address or password is not right.",
    alreadyRegistered: "There is already an account with that email address.",
    signUpFailed: "Could not create the account. Please try again in a while.",
    confirmSent: "A confirmation email is on its way.",
    confirmOpen: "Open the link in it to finish creating your account.",
    backToSignIn: "Back to sign in",
    insecure:
      "This page was opened over an unencrypted connection, so signing in is not possible.",
    insecureWhy: (https: string, localhost: string) =>
      `Browsers treat only ${https} and ${localhost} as secure, and switch off what sign-in needs everywhere else. To try it on a phone, open it over`,
    insecureHow: "instead.",
    draftHere: "What you are making right now lives only on this device.",
    draftSaved: "Create an account and it is kept as it is.",
    draftPending:
      "Nothing is saved until the address is confirmed. Keep this tab open, follow the link in the email, and come back.",
  },

  welcome: {
    tagline: "The formation sheets you hand out at rehearsal, moving in time with the track.",
    guestStart: "Start as a guest",
    withTour: "Start with the walkthrough",
    tourAsk: {
      title: "Want a quick walkthrough?",
      body: "About a minute, pointing at the real screen: the stage, the dancers, and the scenes.",
      withTour: "Show me around",
    },
    guestNote: "No account needed. What you make stays on this device.",
    or: "or",
  },

  projects: {
    cardSummary: (scenes: number, dancers: number) =>
      `${scenes} scenes · ${dancers} dancers`,
    count: (n: number) => `${n} pieces`,
    empty: "No pieces yet.",
    emptyHint: "Type a track name above and a stage appears.",
    newName: "Name for the new piece",
    create: "Create the piece",
    createFailed: "Could not create the piece",
    renamedForClash: (title: string) =>
      `That name was taken, so this one is “${title}”`,
    tapToStart: "Tap to make the first scene",
    noScenes: "no scenes",
    remove: (title: string) => `Delete ${title}`,
    deleteTitle: (title: string) => `Delete “${title}”?`,
    deleteDescription:
      "Every scene, dancer and position in this piece disappears. Deleting cannot be undone.",
    deleteMetaScenes: (n: number) => `${n} scenes`,
    deleteMetaDancers: (n: number) => `${n} dancers`,
    deleteMetaPositions: (n: number) => `${n} positions`,
    deleteFailed: "Could not delete the piece",
    renameFailed: "Could not change the name",
    guestTitle: "My first formation",
    sceneName: (index: number) => `Scene ${index}`,
  },

  confirm: {
    cannotUndo: "Deleting cannot be undone.",
    cancel: "Cancel",
    deleting: "Deleting…",
    delete: "Delete",
  },

  tour: {
    stageTitle: "This is the stage",
    stageBody:
      "Upstage at the top, the audience at the bottom. The circles are dancers — pick one up and move it. The numbers along the bottom are the distance from centre.",
    timelineTitle: "Across is time in the music",
    timelineBody:
      "Each frame sits at the second of the track it belongs to. Drag a frame sideways to change that time, and the gap between frames is the time the move gets.",
    addTitle: "Add a formation",
    addBody:
      "Makes a new formation at the position you are listening to, copied from the current one. Make it, then move people — that is the usual order.",
    viewTitle: "Change what you see",
    viewBody:
      "Paths, the grid, the blocked-view warning and the look of the app are all here. So is this walkthrough, if you want it again.",
    back: "Back",
    close: "Close",
    last: "Start",
    next: "Next",
    nextWithProgress: "Next ({current}/{total})",
    skip: "Skip",
  },

  offline: {
    title: "Offline — Choreon",
    heading: "There is no connection right now",
    body: "Screens you have already opened still work. Go back to the last one, or open this again once you are back online.",
    toProjects: "To your pieces",
  },

  data: {
    needsSignIn: "Sign in before importing",
    imported: "Imported",
    importFailed: "Could not import the file",
    resetTitle: "Empty this piece?",
    resetDescription:
      "Every scene and dancer is deleted. The piece itself stays — its name, the size of the stage, and the start position in the track. This cannot be undone.",
    resetMetaScenes: (n: number) => `${n} scenes`,
    resetMetaDancers: (n: number) => `${n} dancers`,
    resetConfirm: "Empty it",
    resetFailed: "Could not empty the piece",
    unreadableFile: "Could not read the file",
    wrongShape: "That file is not the right shape",
    wrongVersion: "This format cannot be read (it was exported by another version)",
    noProject: "There is no piece in the file",
    incomplete: "Dancers, scenes or positions are missing",
  },

  sceneActions: {
    renameFailed: "Could not rename the scene",
    retimeFailed: "Could not change the time of the scene",
    deleteTitle: (name: string) => `Delete “${name}”?`,
    deleteDescription:
      "The positions in this scene go, and so do the paths leading into it. Deleting cannot be undone (moves and facings can be).",
    deleteMeta: (dancers: number) => `positions for ${dancers} dancers`,
    deleteFailed: "Could not delete the scene",
    remove: (name: string) => `Delete “${name}”`,
  },

  dbErrors: {
    missingColumn:
      "The database schema looks out of date. Run supabase/schema.sql from the Supabase SQL Editor.",
    insufficientPrivilege:
      "Not permitted. Check the table's GRANTs and RLS policies.",
  },

  viewer: {
    move: {
      still: "Stay put",
      to: (direction: string, steps: number) =>
        `${direction} — about ${steps} steps`,
      direction: (
        sideways: "left" | "right" | null,
        depth: "front" | "back" | null,
      ) =>
        [
          sideways === null ? null : sideways === "left" ? "Left" : "Right",
          depth === null ? null : depth === "front" ? "downstage" : "upstage",
        ]
          .filter(Boolean)
          .join(" and "),
      turn: (facing: string) => `＋ ${facing}`,
    },
    facing: {
      0: "facing front",
      45: "facing front-left",
      90: "facing left",
      135: "facing back-left",
      180: "facing back",
      225: "facing back-right",
      270: "facing right",
      315: "facing front-right",
    },
    route: {
      title: (name: string) => `${name}'s route`,
      me: "you",
      everyone: "Everyone",
      all: "All",
      summary: (scenes: number, total: string) =>
        `${scenes} scenes · ${total} end to end`,
      lastFormation: "This is the last formation",
      stepsNote: "Steps are an estimate: 60 cm a step, 90 cm a square.",
      sidesNote: "Left and right are as the audience sees them.",
      fast: " — quick",
      hereNow: " · you are here",
      tooFast: "Too fast to walk",
      reselect: "Pick a different position",
      play: "Play it through",
      stop: "Stop",
      paths: "Paths",
    },
    entry: {
      question: "Which one are you?",
      note: "Pick yourself and only you are drawn solid, with your route written out. You can change it later.",
      position: (name: string) => `${name}'s position`,
      pick: "Pick yourself",
      pickNamed: (name: string) => `Watch as ${name}`,
      skip: "Skip and watch everyone",
    },
    music: {
      pickSame: "Choose the same track on this device",
    },
  },

  share: {
    title: "Share",
    enable: "Anyone with the link can view",
    resume: "Share with this link again",
    stop: "Stop sharing",
    enabledNote: "Sharing is on. People who open the link get a view-only screen",
    disabledNote: "Not sharing right now. The link will not open, even for people who have it",
    noKey:
      "This piece does not have a sharing key yet. Run supabase/schema.sql from the Supabase SQL Editor to enable it.",
    everyone: "Link for everyone",
    copy: "Copy the link",
    copied: "Copied",
    perDancer: "A link for each dancer",
    perDancerNote:
      "Opening it selects that dancer. They see the same thing either way, including everyone else's routes.",
    regenerate: "Make a new link",
    regenerateTitle: "Make a new link?",
    regenerateDescription:
      "The link you have already handed out stops working immediately. You will need to send the new one.",
    regenerateConfirm: "Make a new one",
    regenerated: "The link has been replaced",
    regenerateFailed: "Could not make a new link",
    copyFailed: "Could not copy",
    saveFailed: "Could not change the sharing setting",
    musicNote:
      "The track does not travel with it (the audio never leaves this device). The start position is shared, so once they pick the same track it will line up.",
    sharing: "Shared. Open the link",
  },

  review: {
    errors: {
      notConfigured: "Notes are not set up on this server",
      needsSignIn: "Please sign in first",
      unreadable: "Could not read the request",
      noFormation: "There is no formation to look at",
      emptyScene: "Nobody is in this scene yet",
      unavailable: "No notes came back. Please try again in a moment",
      modelMissing: "The notes service could not be found. This needs a fix on our side",
      rejected: "The notes service refused the key. This needs a fix on our side",
      busy: "The notes service is busy. Please wait a moment and try again",
      tooSlow: "The notes took too long. Please try again",
      empty: "The notes came back empty. Please try again",
    },
    title: "Ask for notes",
    note: "Only the positions in the scene you have open are sent. The name of the piece and the dancers' colours are not. What comes back is something to think with, not a verdict.",
    run: "Ask",
    running: "Asking…",
    again: "Ask again",
    failed: "No notes came back",
    offline: "Could not reach the service",
  },

  exportVideo: {
    title: "Make a video",
    unsupported:
      "This browser cannot record video. Try Chrome on a computer, or Safari on a recent iPhone.",
    needsTwoScenes:
      "With two or more scenes, the movement between them can be recorded.",
    size: "Size",
    showNames: "Show names",
    showNamesNote:
      "With a large cast, turning this off keeps the formation readable",
    running: (seconds: number) =>
      `Recording… ${seconds}s left. Please keep this screen open.`,
    cancel: "Stop",
    note: "Recording takes as long as the piece itself, because it is played through as it records.",
    contains:
      "In the video: the stage, the grid, the dancers (with their facing triangle), the upstage/downstage labels, and the clock.",
    omits:
      "There is no sound (neither the track nor the clicks). The track lives only on this device and is deliberately not shared, so it is not burned in.",
    includeTitle: "Also draw",
    includePathsNote: "Paths you bent by hand come out the same shape as on screen",
    includeNote:
      "All off by default. Only what you pick here goes into the video, regardless of what is on screen.",
    saved: "Video saved",
    failed: "Could not record the video",
  },

  music: {
    title: "Music",
    pick: "Choose a track from this device",
    pickAnother: "Choose a different track",
    file: "Music file",
    remove: "Remove the track",
    keptOnDevice: "Kept on this device. It is still here when you come back.",
    notShared:
      "The audio never leaves this device. Sharing a piece does not carry the track, so ask the other person to pick the same one (the start position is shared).",
    metronomeTitle: "A beat when there is no music",
    metronomeNote:
      "Hear the tempo of the choreography before you have a track. It only sounds while playback is running.",
    metronome: "Metronome",
    click: "Sound the click",
    clickWithMusic: "No click while a track is loaded (the track keeps time)",
    bpm: "Tempo (BPM)",
    beatsPerBar: "Time signature",
    beatsPerBarNote:
      "It does not change the eight-count you count in. It only changes which beat the metronome accents, and which lines are drawn thick on the timeline.",
    offset: "Start position in the track",
    seconds: "s",
    offsetNote:
      "Use this when the choreography starts partway into the track. If the intro is 12.5 seconds, enter 12.5 and playback starts there.",
    offsetFailed: "Could not save the start position",
    span: (total: number, from: string, to: string) =>
      `${total}s end to end · ${from} – ${to}`,
    counts: (set: number, count: number) => `set ${set}, count ${count}`,
    zoomIn: "Zoom in on the timeline",
    zoomOut: "Zoom out on the timeline",
    pxPerSecond: "px/s",
    stacked: (from: number, to: number) =>
      `Scenes ${from}–${to} sit on top of each other. Tap to spread them out and pick one.`,
    scenesShort: "scenes",
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
        extend: (seconds: number) => `Give it ${seconds}s`,
        extendNote: "Later scenes shift back too. Undo removes it",
        body: "The speed comes from the distance and the seconds to the next scene, and it is faster than walking. Drag this scene to the right on the timeline to give the move more time.",
      },
    },
  },

  settings: {
    title: "Settings",

    scope: {
      project: "Changes here apply to this piece only.",
      home: "Changes here apply to every piece.",
      newProjectOnly:
        "Stage size and default tempo are starting values for pieces you make from now on.",
      hasOverride: (n: number) => `${n} setting(s) are set for this piece only`,
      clear: "Stop using piece-only settings",
      cleared: "Piece-only settings removed",
    },

    stage: {
      title: "Stage",
      summary: "Audience side, size of new pieces",
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
      summary: "Snapping, centre line",
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
      summary: "Count-in, default tempo, scene gap",
      countIn: {
        label: "Count-in",
        description:
          "Beats to sound after you press play, before anything starts moving. The count shows in the middle of the screen. In pieces with no track, the clicks carry on afterwards if \"Sound the click\" is on (with a track, only the track plays).",
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
      summary: "Names, paths, floor marks, blind spots, swipe",
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
        description: "Drag the stage to move to the next or previous scene (sideways on phones, up and down on desktop).",
      },
    },

    app: {
      title: "App",
      summary: "Language, look, autosave",
      description:
        "Light gives you the look of a paper chart. For a finer choice, use the palette on the home screen.",
      autoSave: {
        label: "Autosave",
        description:
          "Turn it off and nothing is sent until you press Save in the header.",
        failed: "Could not save",
      },
    },

    data: {
      title: "Data",
      summary: "Export, import, erase everything inside",
      description:
        "Music is not included — the audio never leaves this device. Importing makes a separate piece rather than overwriting this one.",
      export: {
        label: "Export this piece",
        description: "Saves it to your device as JSON.",
      },
      import: "Import from a file",
      reset: {
        label: "Erase everything in this piece",
        description: "Deletes every scene and every dancer. The piece itself stays.",
      },
    },

    account: {
      title: "Account",
      summary: "Another account, sign out, reset settings",
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
