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
    triangle: (rows: number[]) =>
      `Triangle (${rows[0]} back, ${rows[1]} front)`,
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
    spacingLabel: "Spacing",
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
    backToStart: "Back to the start screen",
    addDancer: "Add a dancer",
    projectName: "Piece name",
    projectNameFailed: "Could not rename the piece",
    upstage: "Upstage",
    houseLeft: "House left",
    houseRight: "House right",
    downstage: "Downstage",
    noScenes: "No scenes yet",
    /** シーンがまだ無いまま曲だけ流しているとき（2026-08-22） */
    musicOnly: "Playing the music only",
    noScenesYet: "No scenes yet",
    /** 音先の作品で、曲は鳴っているがまだ最初のシーンへ着いていない間 */
    beforeFirstScene: "No scene here yet",
    createFirstScene: "Make the first scene",
    copyCurrent: "Copy this formation into a new scene",

    narrowScreen: {
      title: "This browser width cannot be used for editing",
      body: "At this width, Choreon is for viewing shared choreography.\nEditing is turned off here.\nWiden the browser window to keep working.",
      openViewer: "Just want to view? Open here",
      pasteLabel: "Paste a shared link to open it",
      pastePlaceholder: "https://... or /view/...",
      pasteOpen: "Open",
      pasteInvalid:
        "That does not look like a shared link. Paste the URL you were given, as it is.",
    },

    view: {
      title: "Menu",
      stageGroup: "How the stage looks",
      appGroup: "App",
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
      collision: {
        label: "Collision check",
        description: "Marks dancers who would run into each other while moving",
      },
      moveStrain: {
        label: "Move too fast",
        description: "Marks moves that are too fast to walk in time",
      },
      stageMarks: {
        label: "Spike marks",
        description: "Lays every scene's positions on the floor",
      },
      thisProject: "This piece",
      music: "Music",
      share: "Share",
      review: "Ask for notes",
      assist: "Ask in words",
      exportVideo: "Make a video",
      tour: "Start the tutorial",
      settings: "Settings",
    },

    shortcuts: {
      title: "Keyboard shortcuts",
      description: "Available in the editor (desktop and tablet).",
      hint: "Press ? to open this list",
      groups: {
        play: "Playback",
        select: "Selecting",
        move: "Moving",
        undo: "Undoing",
      },
      items: {
        playPause: "Play / pause",
        prevNextScene: "Previous / next scene",
        selectAll: "Select everyone in this scene",
        addToSelection: "Add to the selection",
        subtractFromSelection: "Remove the enclosed dancers",
        clearSelection: "Clear the selection / close panels",
        nudgeSmall: (units: number) => `Move by ${units} squares`,
        nudgeLarge: (units: number) => `Move by ${units} squares`,
        contextMenu: "Open facing, align and delete",
        undo: "Undo",
        redo: "Redo",
        browserBack: "The browser's Back also undoes",
      },
      keys: {
        click: "click",
        drag: "drag",
        rightClick: "right click",
        back: "Back",
      },
    },

    dock: {
      openScenes: "Open the scene list",
      cancelCountIn: "Cancel the count-in",
      pause: "Stop",
      play: "Play to the last scene",
      /** シーンがまだ無いとき。進む先が無いので「最後のシーンまで」は嘘になる */
      playMusicOnly: "Play the music",
      sceneSettings: (name: string) => `Open the settings for “${name}”`,
      /** Move length in counts. Written differently from a position (3-5) */
      moveCounts: (counts: string) => ` · ${counts} counts to get there`,
      addScene: "Add a scene",
      /** 曲があるときは鳴らしている最中しか増やせない（canAddScene） */
      addSceneNeedsPlayback:
        "Play the music and press here to drop a scene at that moment",
      hideTimeline: "Collapse the timeline",
      showTimeline: "Show the timeline",
      playFromHere: "Play from the scene you are on",
      playFrom: (name: string) =>
        `Play from "${name}" (where you started last time)`,
    },

    scenes: {
      /** Heading for the position field. Typed in counts (3-5), not seconds */
      countPosition: "Count",
      counts: "counts",
      seconds: "s",
      title: "Scenes",
      dancers: "Dancers",
      sceneName: "Scene name",
      summary: (count: number, counts: string) =>
        `${count} scenes · ${counts} counts in total`,
      /** The gap **out to the next scene**, shown on the row.
       *  Must be the same gap as the hold/move fields below it */
      moveOut: (counts: string) => ` · ${counts} to the next`,
      /** Labels for the two halves of the gap. Either one can be typed in */
      hold: "Hold counts",
      holdLabel: "Counts this formation stays still",
      move: "Move counts",
      moveCountsLabel: "Counts spent moving to the next scene",
      /** The length of the gap being split. Sits above the bar */
      segmentTotalCounts: (counts: string) => `Gap ${counts} counts`,
      /** The bar itself. Hold on the left, move on the right */
      splitBar: "Where the hold ends and the move begins",
      splitBarValue: (hold: number, move: number) =>
        `Hold ${hold} counts, move ${move} counts`,
      delete: "Delete",
      /** The "select" mode for deleting several at once (top of the list) */
      select: "Select",
      selectDone: "Done",
      selectAll: "Select all",
      selectNone: "Clear",
      selectHint: "Tap the scenes you want to delete",
      deleteChecked: (count: number) => `Delete ${count}`,
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
      undoHint: (mod: string) => `Undo (${mod}+Z)`,
      redo: "Redo",
      redoHint: (mod: string) => `Redo (${mod}+Shift+Z)`,
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

    contextMenu: {
      facing: {
        heading: "Facing",
        note: "left/right as seen from the audience",
        front: "the audience",
        frontLeft: "audience-left",
        left: "left",
        backLeft: "back-left",
        back: "the back",
        backRight: "back-right",
        right: "right",
        frontRight: "audience-right",
        turn: (label: string) => `Face ${label}`,
      },
      align: {
        heading: "Line up",
        note: "centred on the group",
        row: "Into one row",
        column: "Into one column",
        spreadX: "Even spacing left-right",
        spreadY: "Even spacing front-back",
      },
      deleteOne: "Delete",
      deleteMany: (count: number) => `Delete ${count} dancers`,
      deleteManyTitle: (count: number) => `Delete these ${count} dancers?`,
      deleteManyMeta: (positions: number) => `${positions} placements`,
      selectAll: "Select everyone",
      addDancer: "Add dancers",
    },

    overlap: {
      title: (name: string) => `This lands on ${name}`,
      titleMany: (count: number) => `This lands on ${count} dancers`,
      description:
        "Placed exactly there, only the dancer on top can be picked up. Nudge it aside?",
      confirm: "Nudge aside",
    },

    errors: {
      metronome: "Couldn't save the click setting",
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
      apply: "Apply",
      applyCount: (count: number) => `Apply (${count})`,
      fixRange: "Fix the value first",
      notApplied: "Nothing changes until you press Apply",
      applied: "Applied",
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
    haveAccount: "Already have an account?",
    noAccount: "No account yet?",
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
    draftPending:
      "Nothing is saved until the address is confirmed. Keep this tab open, follow the link in the email, and come back.",
  },

  welcome: {
    lastViewed: {
      label: "Last viewed",
    },
    guestStart: "Start as a guest",
    withTour: "Start with the walkthrough",
    tourAsk: {
      title: "Want a quick walkthrough?",
      body: "About a minute, pointing at the real screen: the stage, the dancers, and the scenes.",
      withTour: "Show me around",
    },
    or: "or",
  },

  projects: {
    count: (n: number) => `${n} pieces`,
    empty: "No pieces yet.",
    emptyHint: "Type a track name above and a stage appears.",
    newTitle: "New piece",
    newName: "Name",
    create: "Create the piece",
    createFailed: "Could not create the piece",
    renamedForClash: (title: string) =>
      `That name was taken, so this one is “${title}”`,
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
    undoableNote: "(Moves and turns can be taken back with Undo.)",
    cancel: "Cancel",
    deleting: "Deleting…",
    delete: "Delete",
  },

  tour: {
    stageTitle: "This is the stage",
    stageBody:
      "Labels along the top and bottom of the stage mark upstage and the audience side. The circles are dancers — pick one up and move it. The numbers are the distance from centre.",
    timelineTitle: "Across is the count",
    timelineBody:
      "Each frame sits at its count (3-5 means set 3, count 5). Drag a frame sideways to change that position, and the gap between frames is the counts the move gets.",
    addTitle: "Add a formation",
    addBody:
      "Makes a new formation next to the selected one, copied from the current one. Make it, then move people — that is the usual order. While the track is playing it lands where you are listening.",
    viewTitle: "Menu",
    viewBody:
      "The grid, paths and the blocked-view warning are switched here, along with the way in to music, video and settings. So is this walkthrough, if you want it again.",
    back: "Back",
    close: "Close",
    last: "Start",
    next: "Next",
    nextWithProgress: "Next ({current}/{total})",
    skip: "Skip",
  },

  notFound: {
    title: "Not found — Choreon",
    heading: "This page could not be found",
    body: "Either the address is wrong, or the share link was re-issued and no longer opens. Ask whoever sent it for a new one.",
    toProjects: "Go to your pieces",
  },

  offline: {
    title: "Offline — Choreon",
    heading: "There is no connection right now",
    body: "Screens you have already opened still work. Go back to the last one, or open this again once you are back online.",
    toProjects: "To your pieces",
    lastViewed: (title: string) => `Back to "${title}"`,
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
    wrongVersion:
      "This format cannot be read (it was exported by another version)",
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
    moveSecondsFailed: "Could not change the move counts",
    deleteManyTitle: (count: number) => `Delete ${count} scenes?`,
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
    rotate: {
      title: "Please hold your phone upright",
      body: "In landscape the stage fills the screen and the route below it is cut off. Turn the phone back to portrait to keep reading.",
    },
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
      change: "Change",
      title: (name: string) => `${name}'s route`,
      me: "you",
      everyone: "Everyone",
      all: "All",
      summary: (scenes: number, total: string) =>
        `${scenes} scenes · ${total} end to end`,
      lastFormation: "This is the last formation",
      startHere: "You start here",
      stepsNote: "Steps are an estimate: 60 cm a step, 90 cm a square.",
      sidesNote: "Left and right are as the audience sees them.",
      fast: " — quick",
      travelCounts: (counts: string) => `over ${counts} counts`,
      travelCountsAside: (counts: string) => `(over ${counts} counts)`,
      hereNow: " · you are here",
      tooFast: "Too fast to walk",
      reselect: "Pick a different position",
      sceneListOpen: "Open the scene list",
      sceneListTitle: "Scenes",
      sceneListNote: "Tap one to jump there",
      viewMenu: "Change what is shown",
      showNames: "Show names",
      play: "Play it through",
      stop: "Stop",
      paths: "Paths",
    },
    entry: {
      question: "Which one are you?",
      note: "Once you pick, the view focuses on you.",
      position: (name: string) => `${name}'s position`,
      counts: (scenes: number, dancers: number, total: string) =>
        `${scenes} scenes · ${dancers} dancers · ${total}`,
      pick: "Pick yourself",
      pickNamed: (name: string) => `Watch as ${name}`,
      skip: "Skip and watch everyone",
    },
  },

  share: {
    title: "Share",
    enable: "Anyone with the link can view",
    resume: "Share with this link again",
    enabledNote:
      "People who open the link can view the formation focused on themselves.",
    disabledNote:
      "Not sharing right now. The link will not open, even for people who have it",
    noKey:
      "This piece does not have a sharing key yet. Run supabase/schema.sql from the Supabase SQL Editor to enable it.",
    everyone: "Share link",
    copy: "Copy the link",
    copied: "Copied",
    regenerate: "Make a new link",
    regenerateTitle: "Make a new link?",
    regenerateDescription:
      "The link you have already handed out stops working immediately. You will need to send the new one.",
    regenerateConfirm: "Make a new one",
    regenerated: "The link has been replaced",
    regenerateFailed: "Could not make a new link",
    copyFailed: "Could not copy",
    saveFailed: "Could not change the sharing setting",
  },

  assist: {
    title: "Ask in words",
    note: "Write what you want to do. It picks from what the app can do, and shows you the plan first.",
    inputLabel: "What you want to do",
    placeholder: "Fix all the hidden faces",
    ask: "Ask",
    asking: "Thinking…",
    again: "Ask again",
    examples: "For example",
    exampleList: [
      "Fix all the hidden faces",
      "Show the floor spots",
      "Open the third scene",
      "Line everyone up in one row",
      "Make the floor lines circles",
    ],
    confirm: "Go ahead",
    cancel: "Cancel",
    undoHint: "Undo removes it",
    targets: {
      paths: "Paths",
      blindSpot: "Hidden-face check",
      marks: "Floor spots",
      music: "Music",
      share: "Sharing",
      video: "Make a video",
      settings: "Settings",
      review: "Ask for notes",
      template: "Pick a formation",
      addDancer: "Add dancers",
    },
    plan: {
      clearBlindSpots: (count: number) => `Free the hidden faces (${count})`,
      movesSideways: (name: string, from: number, to: number) =>
        `${name} moves ${from} → ${to} (sideways only)`,
      noEscape: (name: string) => `${name} has nowhere to go, so stays put`,
      thisSceneOnly:
        "Only the scene you have open. Nothing before or after moves",
      extendFastMoves: (count: number) => `Add time for the moves (${count})`,
      retime: (sceneName: string, from: number, to: number) =>
        `"${sceneName}" goes from ${from}s to ${to}s`,
      walkable: (name: string) => `${name} can walk it`,
      rippleNote: "Later scenes shift back by the same amount",
      applyFormation: (name: string, count: number) =>
        `Arrange ${count} dancers as "${name}"`,
      nearestAssignment: "Everyone goes to the nearest open spot",
      setGrid: (name: string) => `Floor lines set to "${name}"`,
      turnedOn: (name: string) => `${name} is now showing`,
      turnedOff: (name: string) => `${name} is now hidden`,
      alreadyOn: (name: string) => `${name} is already showing`,
      alreadyOff: (name: string) => `${name} is already hidden`,
      opened: (name: string) => `Opened ${name}`,
      selectScene: (number: number, name: string) =>
        `Opened ${number}. ${name}`,
    },
    nothingToDo: "There is nothing to do right now",
    errors: {
      notConfigured: "This is not set up on this server",
      needsSignIn: "Please sign in first",
      unreadable: "Could not read the request",
      tooLong: "That is too long. Please keep it short",
      notUnderstood:
        "I could not work that out. Try one thing at a time, like asking to fix all the hidden faces.",
      unavailable: "That did not work. Please try again in a moment",
      modelMissing:
        "The service could not be found. This needs a fix on our side",
      rejected: "The service refused the key. This needs a fix on our side",
      rateLimited:
        "The request limit has been reached. Please leave it a while and try again",
      busy: "It is busy right now. Please wait a moment and try again",
      tooSlow: "The reply took too long. Please try again",
      empty: "The reply came back empty. Please try again",
    },
  },

  review: {
    errors: {
      notConfigured: "Notes are not set up on this server",
      needsSignIn: "Please sign in first",
      unreadable: "Could not read the request",
      noFormation: "There is no formation to look at",
      emptyScene: "Nobody is in this scene yet",
      unavailable: "No notes came back. Please try again in a moment",
      modelMissing:
        "The notes service could not be found. This needs a fix on our side",
      rejected:
        "The notes service refused the key. This needs a fix on our side",
      rateLimited:
        "The request limit has been reached. Please leave it a while and try again",
      busy: "The notes service is busy. Please wait a moment and try again",
      tooSlow: "The notes took too long. Please try again",
      empty: "The notes came back empty. Please try again",
      garbled: "The reply was cut off. Please try again",
    },
    title: "Ask for notes",
    note: "Only the positions in the scene you have open are sent. The name of the piece and the dancers' colours are not. What comes back is something to think with, not a verdict.",
    good: "Working well",
    watch: "Worth a look",
    decide:
      "A fix button only changes anything when you press it. Whether to take it is yours to decide (undo removes it).",
    applied: "Applied",
    formationExample: "Arranged like this",
    formationApply: "Use this arrangement",
    formationNote: "Everyone goes to the nearest open spot",
    audienceSide: "Audience",
    scope: "What to look at",
    scopeScene: "This scene",
    scopePiece: "Whole piece",
    scopePieceNote:
      "Only each scene's spread, centre and warnings are sent — not the positions themselves. What comes back is about the flow.",
    inScene: (number: number, name: string) => `${number}. ${name}`,
    wholePiece: "Whole piece",
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
    running: (seconds: number) =>
      `Recording… ${seconds}s left. Please keep this screen open.`,
    cancel: "Stop",
    start: (seconds: number) => `Make a ${seconds}s video`,
    note: "Recording takes as long as the piece itself, because it is played through as it records.",
    contains:
      "In the video: the stage, the grid, the dancers (with their facing triangle), the upstage/downstage labels, and the clock.",
    omits: "Metronome clicks are never included.",
    includeTitle: "Also draw",
    includeAudioTitle: "Sound",
    includeAudio: "Include the track",
    includeAudioNote:
      "It starts from the beginning of the track and runs for the length of the video. Nothing plays while exporting.",
    includeAudioWarning:
      "This video will contain the track. Be careful who you hand it to (share links still never carry the track).",
    saved: "Video saved",
    failed: "Could not record the video",
  },

  music: {
    title: "Music",
    pick: "Choose a track from this device",
    pickAnother: "Choose a different track",
    file: "Music file",
    remove: "Remove the track",
    titleFailed: "Could not save the track name",
    missingOnDevice:
      "The audio is not on this device (the project still remembers the track). Choose the same track again to hear it.",
    notShared:
      "Kept on this device, so it plays when you come back — but it does not travel to the people you share with (only the start position does).",
    metronomeTitle: "A beat when there is no music",
    metronome: "Metronome",
    click: "Sound the click",
    bpm: "Tempo (BPM)",
    bpmUnit: "BPM",
    bpmNote:
      "Dragging the handle on the timeline bar changes the same tempo",
    tapTempo: "Click to measure",
    tapTempoNote:
      "Press ▶, then click about four times along with the track",
    tapPlay: "Play this part",
    tapPause: "Stop",
    tapTempoFor: (name: string) => `Click to measure “${name}”`,
    tapTempoCount: (count: number) =>
      `${count} taps · pause to start over`,
    beatsPerBar: "Time signature",
    beatsPerBarNote:
      "Only changes which beat the metronome accents and which timeline lines are thick (the eight-count is unaffected).",
    seconds: "s",
    span: (total: number, from: string, to: string) =>
      `${total}s end to end · ${from} – ${to}`,
    counts: (set: number, count: number) => `set ${set}, count ${count}`,
    placeBar: "Where the choreography sits in the track",
    placeMove:
      "Tap to jump to this song's start, drag to move the whole choreography",
    placeStretch: "Set where the choreography ends",
    placeSpan: (from: string, to: string) => `Choreography ${from} – ${to}`,
    placeFailed: "Could not save how the choreography sits on the track",
    zoomIn: "Zoom in on the timeline",
    zoomOut: "Zoom out on the timeline",
    pxPerSecond: "px/s",
    stacked: (from: number, to: number) =>
      `Scenes ${from}–${to} sit on top of each other. Tap to spread them out and pick one.`,
    scenesShort: "scenes",
    /* Song sections (2026-09-15). A showcase runs through several songs;
       the beats never break, only the way they are laid onto the audio */
    sectionsTitle: "Song sections",
    sectionsNote:
      "Use this when the song changes partway through the showcase. Adding a section moves nothing — afterwards you can set the tempo and the start of that part on its own.",
    sectionDefaultName: (order: number) => `Song ${order}`,
    sectionName: "Song name",
    sectionStart: (clock: string) => `from ${clock}`,
    sectionSplit: "Start a new song here",
    sectionSplitNote: "Splits at the nearest count of 8 to the selected scene.",
    sectionNeedScene: "Select a scene to choose where to split.",
    sectionRemove: "Remove this section",
    sectionBpm: "Tempo of this part (BPM)",
  },

  dancer: {
    add: {
      title: "Add dancers",
      howMany: "How many?",
      minus: "One fewer",
      plus: "One more",
      count: "How many to add",
      people: "dancers",
      autoNote: "Names and colours are ready. Change them here if you like",
      /** 名前の欄。打たなければ、下に薄く出ている名前で作る */
      nameLabel: (nth: number) => `Name of dancer ${nth}`,
      colorLabel: (name: string) => `Choose the colour for ${name}`,
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
      count: (n: number) => `${n}`,
      empty: "Nobody is in this scene yet.",
      sortLabel: "Sort",
      sorts: { added: "Added", name: "Name" },
    },
    inspector: {
      name: "Dancer name",
      seconds: "s",
      focus: "Focus on me",
      focusOn: "Focused",
      remove: "Delete this dancer",
      deselect: "Deselect",
      changeColor: (color: string) => `Change the colour to ${color}`,
      customColor: "Pick any colour",
      colorHardToSee:
      "In this theme, that colour is hard to tell from the stage. You can still use it.",
    customColorNote: "A colour you pick stays as it is when you change themes",
      rotate: "Change the facing",
      curve: (name: string) => `Adjust the curve for ${name}`,
      deleteTitle: (name: string) => `Delete “${name}”?`,
      deleteDescription:
        "Their position and paths disappear from every scene. Deleting cannot be undone (moves and facings can be).",
      deleteMeta: (scenes: number) => `positions in ${scenes} scenes`,
      nameFailed: "Could not rename the dancer",
      colorFailed: "Could not change the colour",
      deleteFailed: "Could not delete the dancer",
    },
    badges: {
      blindSpot: {
        text: (name: string) =>
          `${name}: hidden behind someone, out of sight from the audience`,
        heading: "Blocked-view check",
        moveOut: "Step aside to be seen",
        moveOutNote: "Moves the shortest way. Undo removes it",
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
        'Only the default tempo under "Playback" is a starting value for pieces you make from now on (it does not change the piece you have open).',
      hasOverride: (n: number) => `${n} setting(s) are set for this piece only`,
      clear: "Stop using piece-only settings",
      cleared: "Piece-only settings removed",
    },

    projectStage: {
      description: "This size belongs to this piece only. 1 cell = 90cm",
      floor: (width: number, height: number) =>
        `Below ${width}x${height} cells, anyone who no longer fits is moved to the nearest edge. 1 cell = 90cm`,
      moved: (count: number) =>
        `Moved ${count} dancer(s) to the nearest edge. Undo puts them back`,
      failed: "Could not save the stage size",
    },
    stage: {
      title: "Stage",
      summaryInProject: "Stage size for this piece",
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
      summary: "Centre line",
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
          'Beats to sound after you press play, before anything starts moving. The count shows in the middle of the screen. In pieces with no track, the clicks carry on afterwards if "Sound the click" is on (with a track, only the track plays).',
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
      summary: "Audience side, names, paths, floor marks, blind spots",
      description:
        "Paths, blind spots and floor marks are the same switches as in the editor's menu. Either way in points at the same state.",
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
    },

    warnings: {
      title: "Warnings",
      summary: "Blocked view, collisions, moves that are too fast",
      description:
        "Badges shown on dancers on stage. Turning these off does not change what the AI review or the assist suggestions look at.",
      blindSpot: {
        label: "Blocked view",
        description:
          "Marks anyone standing directly behind someone, out of sight from the audience.",
      },
      collision: {
        label: "Collision",
        description: "Marks dancers who would run into each other while moving.",
      },
      moveStrain: {
        label: "Move too fast",
        description: "Marks moves that are too fast to walk in time.",
      },
    },

    shortcuts: {
      title: "Keyboard shortcuts",
      summary: "What the keys and the mouse can do",
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
        description:
          "Deletes every scene and every dancer. The piece itself stays.",
      },
    },

    account: {
      title: "Account",
      summary: "Another account, sign out, reset settings",
      summaryGuest: "Sign in, reset settings",
      switch: {
        label: "Sign in with another account",
        description:
          "Signs out of this account and goes to the sign-in screen.",
        confirmTitle: "Sign in with another account?",
        confirmDescription:
          "You will be signed out of this account first. Pieces belong to the account that made them, so another account will not see them.",
        confirmLabel: "Sign out and continue",
      },
      signOut: "Sign out",
      signInGuest: {
        label: "Sign in / Sign up",
        description:
          "Your draft stays on this device. Signing in lets you save it as a piece",
      },
      resetSettings: {
        label: "Reset settings",
        description:
          "Restores only the choices on this screen. Your pieces are untouched.",
      },
    },
  },
} satisfies Messages;
