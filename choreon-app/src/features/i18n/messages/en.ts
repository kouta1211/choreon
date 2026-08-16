import type { Messages } from './ja';

/**
 * English. Same shape as `ja.ts` (that file is the source of the type, so a
 * missing key stops the build). Wording matches the web app where the same
 * thing exists there — theme names, formation names, the sign-in error.
 */
export const en: Messages = {
  app: {
    title: 'Choreon',
    subtitle: 'Native build',
  },

  editor: {
    draft: 'Native draft',
    dancers: 'Dancers',
    formations: 'Formations',
    music: 'Music',
    editScene: 'Edit scene',
    menu: 'View and modes',
    menuView: 'View',
    menuOpen: 'Open',
    menuBadge: (count: number) => `${count}`,
  },

  tour: {
    stageTitle: 'This is the stage',
    stageBody:
      'Upstage at the top, the audience at the bottom. The circles are dancers — pick one up and move it. The numbers along the bottom are the distance from centre.',
    timelineTitle: 'Across is time in the music',
    timelineBody:
      'Each frame sits at the second of the track it belongs to. Drag a frame sideways to change that time, and the gap between frames is the time the move gets.',
    dockTitle: 'The formation strip',
    dockBody:
      'Tap a frame to switch to that formation. They run left to right, in performance order. Load a track and this strip becomes a time axis, with each frame at the second it lands on.',
    addTitle: 'Add a formation',
    addBody:
      'Makes a new formation at the position you are listening to, copied from the current one. Make it, then move people — that is the usual order.',
    viewTitle: 'Change what you see',
    viewBody:
      'Paths, the grid, the blocked-view warning and the look of the app are all here. So is this walkthrough, if you want it again.',
    back: 'Back',
    last: 'Start',
    nextWithProgress: (current: number, total: number) => `Next (${current}/${total})`,
    skip: 'Skip',
    replay: 'Show the walkthrough again',
  },

  welcome: {
    tagline: 'Build formations along the music',
    guestStart: 'Start as a guest',
    withTour: 'Start with the walkthrough',
    guestNote: 'No account needed. What you make stays on this device only.',
    or: 'or',
    signIn: 'Sign in and open your own work',
  },

  common: {
    on: 'On',
    off: 'Off',
    retry: 'Try again',
    close: 'Close',
    back: 'Back',
    done: 'Done',
  },

  projects: {
    section: 'Projects',
    count: (n: number) => `${n}`,
    newName: 'Name for the new project',
    create: 'Create',
    createFailed: 'Could not create the project',
    renamedForClash: (title: string) => `That name was taken, so it is “${title}”`,
    rename: 'Rename',
    renameFailed: 'Could not rename it',
    remove: (title: string) => `Delete ${title}`,
    deleteTitle: (title: string) => `Delete “${title}”?`,
    deleteDescription: 'Every scene, dancer and placement in it goes too.',
    deleteFailed: 'Could not delete the project',
    guestTitle: 'My first formation',
    sceneName: (index: number) => `Scene ${index}`,
    saveDraft: 'Save this draft as my project',
    saveDraftNote: 'It becomes a new project on the account you are signed in to.',
    saveDraftFailed: 'Could not save it',
    saved: (title: string) => `Saved as “${title}”`,
    unsaved: 'There are unsaved changes',
    discardDraftTitle: 'This draft will be lost',
    discardDraftDescription:
      'The draft lives only inside this app, and opening another piece cannot be undone. To keep it, cancel and press "Save this draft as my own work" first.',
    discardDraftConfirm: 'Open',
  },

  confirm: {
    cancel: 'Cancel',
    delete: 'Delete',
    deleting: 'Deleting…',
    cannotUndo: 'This cannot be undone.',
    undoNote: '(Moves and facing changes can still be undone.)',
  },

  stage: {
    backstage: 'Upstage',
    audience: 'Downstage',
    blockedBadge: 'H',
  },

  playback: {
    play: '▶ Run through',
    stop: '■ Stop',
    rewind: 'Back to start',
    countingIn: (beats: number) => `${beats}`,
    metronome: 'Metronome',
  },

  history: {
    undo: '↩ Undo',
    redo: '↪ Redo',
  },

  music: {
    section: 'Music',
    pick: '♪ Choose a track',
    clear: 'Remove',
    failed: 'Could not load that track',
    withMusic:
      'Run through starts from the scene you are on. While a track is loaded, the clock is the track itself — it cannot drift.',
    withoutMusic:
      'Load a track and the run-through follows it. Without one, it runs on seconds alone.',
    kept: 'Kept on this device (one track per project). It is still here next time you open it.',
  },

  viewer: {
    readOnly: 'View only',
    missing: 'This piece could not be opened',
    missingNote:
      'The link was replaced, or sharing was turned off. Check with whoever sent it.',
    back: 'Close',

    move: {
      still: 'Stay',
      to: (direction: string, steps: number) => `${direction} about ${steps} steps`,
      direction: (
        sideways: 'left' | 'right' | null,
        depth: 'front' | 'back' | null,
      ) => {
        const parts: string[] = [];
        if (sideways !== null) parts.push(sideways === 'left' ? 'stage right' : 'stage left');
        if (depth !== null) parts.push(depth === 'front' ? 'downstage' : 'upstage');
        return parts.join(' and ');
      },
      turn: (facing: string) => `+ ${facing}`,
    },
    facing: {
      0: 'facing the audience',
      45: 'facing downstage right',
      90: 'facing stage right',
      135: 'facing upstage right',
      180: 'facing upstage',
      225: 'facing upstage left',
      270: 'facing stage left',
      315: 'facing downstage left',
    },
    route: {
      title: (name: string) => `${name}âs route`,
      everyone: 'Everyone',
      summary: (scenes: number, total: string) => `${scenes} scenes Â· ${total} total`,
      lastFormation: 'This is the last formation',
      stepsNote: 'Steps are a guide: 60cm per step, 90cm per square.',
      sidesNote: 'Stage left and right are from the audienceâs point of view.',
      fast: ' â fast',
      hereNow: ' Â· here now',
      reselect: 'Pick a different position',
    },
    entry: {
      question: 'Which one are you?',
      note: 'Pick yourself and only you stay solid, with your route written out. You can change it later.',
      skip: 'Skip and watch everyone',
    },
  },

  song: {
    description:
      'About the track this piece runs on. The metronome and the count-in both read these. The "default tempo" in Settings is the starting value for pieces you make later — a different thing.',
    metronomeNote: 'Whether it sounds is this device only; it is not part of the piece',
    bpm: 'Tempo (BPM)',
    bpmUnit: 'BPM',
    bpmNote: 'With no track loaded, this is what measures time',
    presetLabel: (bpm: number) => `Set the tempo to ${bpm}`,
    beatsPerBar: 'Time signature',
    beatsOption: (beats: number) => `${beats}/4`,
    beatsNote:
      'The counting unit (8-counts) does not change with this. All it changes is which beat the metronome accents, and which lines are drawn thick on the time axis.',
    offset: 'Start of the track',
    seconds: 's',
    offsetNote:
      'Use this when the choreography starts partway into the track. If the intro runs 12.5 seconds, enter 12.5 and playback starts there.',
    bpmFailed: 'Could not save the tempo. Put it back.',
    beatsFailed: 'Could not save the time signature. Put it back.',
    offsetFailed: 'Could not save the start of the track. Put it back.',
  },

  timeline: {
    section: 'Timeline',
    scale: (px: number) => `1s = ${px}px`,
    note:
      'Drag a card sideways to change when that scene happens. Where scenes are tight, only the number is shown. The waveform is not available yet.',
  },

  scenes: {
    section: 'Scenes',
    add: 'Add a scene',
    newName: (index: number) => `Scene ${index}`,
    editTitle: (number: string) => `Edit scene ${number}`,
    nameLabel: 'Scene name',
    pickOne: 'Pick a scene to edit it here',
    firstNote: (seconds: string) =>
      `The first scene has no travel time (there is nothing before it). It sits at ${seconds}s in the track.`,
    segment: 'Travel time from the previous scene',
    shorter: 'Shorten the travel time',
    longer: 'Lengthen the travel time',
    ripple: 'Shift later scenes too',
    rippleNote: (seconds: string) =>
      `With this off, the next scene is never pushed — it stops just short of it. This scene sits at ${seconds}s.`,
    order: 'Order',
    moveEarlier: '← Earlier',
    moveLater: 'Later →',
    orderNote:
      'Swaps times with the neighbouring scene. The overall timing of the piece stays the same; only which formation lands there changes.',
    remove: 'Delete this scene',
    removeTitle: (name: string) => `Delete “${name}”?`,
    removeDescription: 'The scene and every placement in it go together.',
    removeMetaPositions: (count: number) => `${count} placements`,
    addFailed: 'Could not add the scene',
    removeFailed: 'Could not delete the scene',
    renameFailed: 'Could not save the name. Put it back.',
    retimeFailed: 'Could not save the timing. Put it back.',
  },

  dancers: {
    section: (count: number) => `Dancers (${count})`,
    add: '＋ Add',
    addLabel: 'Add a dancer',
    selected: 'Selected:',
    colorLabel: (color: string) => `Use ${color}`,
    remove: 'Remove this dancer',
    removeTitle: (name: string) => `Remove ${name}?`,
    removeDescription: 'They will be gone from every scene.',
    removeMetaScenes: (count: number) => `placements in ${count} scenes`,
    hint: 'Pick someone on stage or in the list above to recolour or remove them',
    addFailed: 'Could not add the dancer',
    removeFailed: 'Could not remove that dancer',
    colorFailed: 'Could not save the colour. Put it back.',

    inspector: {
      name: 'Name',
      nameFailed: 'Could not save the name. Put it back.',
      focus: 'Focus on this dancer',
      focusOn: 'Focused',
      deselect: 'Deselect',
      ownDuration: 'Travel time for this dancer only',
      ownDurationFailed: 'Could not save the travel time. Put it back.',
      seconds: 's',
      inherit: (seconds: string) => `${seconds}`,
    },
  },

  formations: {
    section: 'Formations',
    count: (n: number) => ` (${n})`,
    needsTwo: 'You need at least two dancers in this scene to pick a formation.',
    noneForCount: (n: number) =>
      `No shapes for ${n} dancers yet (there are shapes for 2–10).`,
    flipX: 'Flip left/right',
    flipY: 'Flip up/downstage',
    rotate: 'Turn 90°',
    spacing: 'Spacing',
    spacingNarrow: 'Tight',
    spacingNormal: 'Normal',
    spacingWide: 'Wide',
    hint: 'Everyone moves to their nearest spot. Undo puts them all back at once.',
    applied: (name: string) => `Set to ${name}`,
    appliedPartial: (name: string, left: number) =>
      `Set to ${name} (${left} left where they were)`,
    failed: 'Could not save the formation. Put it back.',
  },

  positions: {
    saveFailed: 'Could not save. The dancer is back where they were.',
  },

  account: {
    section: 'Account',
    checking: ' (checking)',
    email: 'Email',
    password: 'Password',
    signIn: 'Sign in',
    signUp: 'Sign up',
    signOut: 'Sign out',
    wrongCredentials: 'That email or password is not right',
    alreadyRegistered: 'That email is already registered',
    signUpFailed: 'Could not sign you up',
    confirmSent: 'Check your email and open the link, then sign in',
    note: 'Same account as the web app. Anything you change here is saved. This build has not been checked on a real phone yet, so start with a project you can afford to lose.',
    open: 'Open',
    empty: 'No projects yet',
    listFailed: 'Could not load your projects (connection or permissions)',
    notFound: 'That project could not be found',
    openFailed: 'Could not open that project',
    opened: (title: string) => `“${title}” is open — changes here are saved`,
  },

  themeSection: {
    title: 'Theme',
    loading: ' (loading)',
    note: 'Colours are copied from the web app’s themes.css. Your choice stays on this device.',
    perProject: 'Use a different theme for this project',
    texture: 'Background texture',
    textureNote: 'A faint pattern over the backdrop. It does not reach inside the stage.',
    perProjectNote:
      'This theme applies only while this project is open. Other projects keep the device default.',
  },

  textures: {
    flat: 'None',
    horizon: 'Cyclorama wash',
    spot: 'Spotlight pool',
    grid: 'Grid and marks',
    nebula: 'Nebula',
    grain: 'Grain',
    curtain: 'Blackout curtain',
  },

  themes: {
    midnight: 'Midnight Pink',
    neon: 'Neon Cyan',
    amber: 'Amber Stage',
    mono: 'Monochrome',
    chalk: 'Blackboard & Chalk',
    paper: 'Paper Chart',
    gridnote: 'Grid Notebook & Blue Ink',
    kraft: 'Kraft Paper & Letterpress',
    tracing: 'Tracing Paper',
    whiteboard: 'Whiteboard & Marker',
  },

  settings: {
    title: 'Settings',
    loading: ' (loading)',
    storageNote:
      'These choices stay on this device only (localStorage on the web, AsyncStorage on iOS/Android). They are not part of the piece itself.',

    stage: {
      title: 'Stage',
      summary: 'Which way the audience sits',
      description:
        'Flipping the view does not move any saved position. Only the drawing direction and the words for upstage/downstage swap over.',
      audienceOnTop: {
        label: 'Audience at the top',
        description:
          'By default the top is backstage. Flip it when you are building in front of a mirror',
      },
    },

    grid: {
      title: 'Grid',
      summary: 'How the grid is drawn, and snapping',
      mode: {
        label: 'Grid',
        square: 'Squares',
        circle: 'Circle',
        none: 'None',
      },
      centerLine: {
        label: 'Centre line',
        description: 'Marks the middle column in its own colour — the line formations are built around (hidden when the grid is off)',
      },
      snap: {
        label: 'Snap to the grid',
        description: 'Turn it off to place dancers anywhere',
      },
    },

    playback: {
      title: 'Playback',
      summary: 'Count-in, default tempo, gap when adding a scene',
      countIn: {
        label: 'Count-in',
        description: 'Beats played after you press run-through, before anything moves',
        off: 'None',
        beats: (n: number) => `${n} beats`,
      },
      bpm: {
        label: 'Default tempo',
        description: 'Goes into new projects. The tempo of the project you have open does not change',
        unit: 'BPM',
      },
      segment: {
        label: 'Scene gap',
        description:
          'How many seconds after the current scene a new one is placed. At 120 BPM, 4 seconds is one 8-count',
        unit: 's',
      },
    },

    display: {
      title: 'Display',
      summary: 'Names, paths, spike marks, hidden faces, swipe',
      description:
        'Badges on a dancer: H = hidden behind someone downstage / a number = the move to the next scene is too fast (m/s; shown above 3.5). The speed badge is always on.',
      dancerName: {
        label: 'Dancer names',
        description:
          'With a large cast the stage fills up with names. Showing only the selected one keeps the formation readable',
        always: 'Always',
        selected: 'Selected',
        never: 'Never',
      },
      path: {
        label: 'Paths',
        description: 'Draws the move to the next scene as a line',
      },
      stageMarks: {
        label: 'Spike marks',
        description: 'Lays a ruler along the downstage edge, measured from centre',
      },
      blindSpot: {
        label: 'Hidden faces',
        description: 'Marks anyone standing directly behind someone downstage of them',
      },
      swipe: {
        label: 'Swipe to change scene',
        description: 'Drag sideways across the stage to move between scenes',
      },
    },

    app: {
      title: 'App',
      summary: 'Theme, language, auto-save',
      scheme: {
        label: 'Brightness',
        description: 'Pick from the ten themes in the palette below. This only decides dark or light',
        dark: 'Dark',
        light: 'Light',
        system: 'Match device',
      },
      autoSave: {
        label: 'Auto-save',
        description: 'With this off, nothing is sent until you press “Save now”',
        pending: (count: number) => `${count} changes not sent yet`,
        flush: 'Save now',
        failed: 'Could not save. Try again.',
        done: 'Saved',
      },
    },

    account: {
      title: 'Account',
      summary: 'Sign in, open a piece, reset settings',
      resetSettings: {
        label: 'Reset settings to defaults',
        description: 'Only the choices on these screens. Your projects are untouched',
        title: 'Reset settings to defaults?',
        confirm: 'Reset',
      },
    },
  },

  data: {
    title: 'Data',
    summary: 'Export and import',
    description:
      'The track is not included (audio never leaves this device). An import is always created as a separate project, so nothing is overwritten.',
    export: 'Export',
    exportNote: 'Saves a JSON file you can keep. It pastes into a spreadsheet and is readable by eye.',
    exportFailed: 'Could not export',
    exportedWeb: (name: string) => `Downloaded ${name}`,
    import: 'Import from a file',
    resetTitle: 'Empty this project?',
    resetDescription:
      'Every scene and dancer goes. The project itself (its name and stage size) stays.',
    resetMetaScenes: (n: number) => `${n} scenes`,
    resetMetaDancers: (n: number) => `${n} dancers`,
    resetLabel: 'Empty this project',
    resetNote: 'For starting over. To delete the project itself, go to Settings → Account.',
    resetConfirm: 'Empty it',
    resetFailed: 'Could not empty it',
    needsSignIn: 'Sign in before importing',
    imported: (title: string) => `Imported as “${title}”`,
    importFailed: 'Could not import that',
    unreadableFile: 'Could not read that file',
    wrongShape: 'That file has the wrong shape',
    wrongVersion: 'This format cannot be read (it was exported by another version)',
    noProject: 'There is no project in it',
    incomplete: 'Dancers, scenes or placements are missing',
  },

  share: {
    title: 'Sharing',
    summary: 'Hand out a link, or make a new one',
    description:
      'Anyone with the link can follow the routes. They cannot edit, and the track is not included.',
    toggle: 'Share this project',
    toggleNote: 'Turning it off makes every link you handed out stop working straight away.',
    link: 'Link',
    send: 'Send the link',
    rotate: 'Make a new link',
    rotateNote: 'The link you handed out before stops working.',
    rotateTitle: 'Make a new link?',
    rotateDescription: 'The link you handed out before stops working immediately.',
    rotateConfirm: 'Make a new one',
    failed: 'Could not change the sharing setting',
    needsProject: 'Open a project first',
    off: 'Not shared yet',
  },

  language: {
    section: 'Language',
    note: 'Your choice stays on this device.',
  },

  supabase: {
    section: 'Supabase',
    checking: 'Checking…',
    reached: 'Reached',
    failed: (status: number) => `No answer (${status})`,
    offline: 'No answer (could not connect)',
    signedIn: 'signed in',
    signedOut: 'signed out',
    platform: 'Platform',
  },

  formationNames: {
    row: 'Single line',
    rowPair: 'Side by side',
    rowFront: 'Line, downstage',
    rowBack: 'Line, upstage',
    column: 'Single file',
    columnPair: 'One behind the other',
    diagonal: 'Diagonal',
    diagonalLine: 'Diagonal line',
    lShape: 'L shape',
    xShape: 'X shape',
    wShape: 'W (zigzag)',
    diamond: 'Diamond',
    circle: 'Circle',
    circleCenter: 'Circle with a centre',
    arc: 'Arc',
    wedgeIn: 'Opening out (narrow upstage)',
    wedgeOut: 'Closing in (wide upstage)',
    triangle: (rows: number[]) => `Triangle (${rows[0]} back, ${rows[1]} front)`,
    triangleDown: (rows: number[]) =>
      `Inverted triangle (${rows[0]} back, ${rows[1]} front)`,
    v: (rows: number[]) => `V (${rows.join('-')} from upstage)`,
    vDown: (rows: number[]) => `Inverted V (${rows.join('-')} from upstage)`,
    twoRows: (rows: number[]) => `Two lines (${rows.join('-')})`,
    twoColumns: (rows: number[]) => `Two files (${rows.join('-')})`,
    stagger: (rows: number[]) => `Staggered (${rows.join('-')})`,
    arcRows: (rows: number[]) => `Two arcs (${rows.join('-')})`,
    grid: (rows: number[]) => `${rows[0]}×${rows[1]} grid`,
  },
};
