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

  common: {
    on: 'On',
    off: 'Off',
    retry: 'Try again',
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
      'Load a track and the run-through follows it. Without one, it runs on seconds alone. Reopening the app clears the choice.',
  },

  scenes: {
    section: 'Scenes',
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
    remove: 'Delete this scene',
    removeConfirm: (name: string, dancers: number) =>
      `Really delete “${name}” (${dancers} placements go with it)`,
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
    removeConfirm: (name: string) => `Really remove ${name}`,
    hint: 'Pick someone on stage or in the list above to recolour or remove them',
    addFailed: 'Could not add the dancer',
    removeFailed: 'Could not remove that dancer',
    colorFailed: 'Could not save the colour. Put it back.',
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
    section: 'Kept on this device',
    loading: ' (loading)',
    audienceOnTop: 'Audience at the top',
    dancerName: 'Dancer names',
    dancerNameAlways: 'Always',
    dancerNameNever: 'Never',
    grid: 'Grid',
    gridSquare: 'Squares',
    gridNone: 'None',
    swipe: 'Swipe to change scene',
    path: 'Show paths',
    marks: 'Spike marks (downstage ruler)',
    blindSpot: 'Find hidden faces',
    badgeNote:
      'Badges on a dancer: H = hidden behind someone downstage / a number = the move to the next scene is too fast (m/s; shown above 3.5). The speed badge is always on.',
    storageNote:
      'The first two are settings; the grid is a view preference. Both go to localStorage on the web and AsyncStorage on iOS/Android.',
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
