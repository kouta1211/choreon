import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Web版と**そっくり同じまま持ってきたファイル**が、ずれていないか。
 *
 * ■ なぜ要るか
 * ネイティブ版は Web版から純粋な計算だけを丸ごと写して使っている
 * （隊形の並べ方・秒の配り方・顔被りの判定など31本）。中身が同じである
 * ことに意味があるのに、**片方だけ直しても誰も気づかない**。
 * 「Web版で直したバグがスマホでは直っていない」は、動かしても分からず、
 * 実機で振付を組んでいる最中に食い違いとして出る。
 *
 * ■ ずれてよい場合
 * 意図してネイティブ側だけ変えたなら、この一覧から外して**なぜ分けたかを
 * 書く**。黙って外さない — 外した記録が残らないと、次の人には
 * 「元から別物」に見える。
 *
 * ■ 比べ方
 * 改行コードだけ揃えて、そのまま突き合わせる。Web版が無い環境
 * （ネイティブ版だけを取り出したとき）では、静かに飛ばす。
 */

/** リポジトリのルートから見た、Web版とネイティブ版の対応 */
const WEB_ROOT = join(__dirname, '..', '..', '..', 'src', 'features');
const NATIVE_ROOT = join(__dirname, '..', 'features');

/**
 * 同一を保つファイル。**足すときは、本当に同じでよいかを確かめてから。**
 * 端末の API を触るもの（storage・supabase・音）はここに入らない。
 */
const SHARED = [
  'canvas/lib/blindSpot.ts',
  'canvas/lib/collision.ts',
  'canvas/lib/curvePath.ts',
  'canvas/lib/dragMath.ts',
  'canvas/lib/formationTemplates.ts',
  'canvas/lib/physicalLimits.ts',
  'canvas/lib/sceneScrub.ts',
  'canvas/lib/sceneStep.ts',
  'canvas/lib/stageFlip.ts',
  'canvas/store/useHistoryStore.ts',
  'dancer/api/dancers.ts',
  'dancer/constants.ts',
  'dancer/lib/newDancers.ts',
  'dancer/types.ts',
  'i18n/lib/locale.ts',
  'music/lib/metronome.ts',
  'music/lib/musicTimeline.ts',
  'music/lib/playbackStart.ts',
  'music/lib/timelineScale.ts',
  'project/lib/projectTitle.ts',
  'review/lib/formationSummary.ts',
  'project/types.ts',
  'scene/api/positions.ts',
  'scene/api/scenes.ts',
  'scene/lib/sceneTiming.ts',
  'scene/types.ts',
  'settings/lib/backup.ts',
  'theme/catalog.ts',
  'theme/lib/themePreference.ts',
  'viewer/lib/describeMove.ts',
  'viewer/lib/interpolate.ts',
  'viewer/lib/rulerTicks.ts',
];

const hasWeb = existsSync(WEB_ROOT);

/** 改行コードの違いだけは無視する（Windows で checkout すると変わる） */
function read(path: string): string {
  return readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
}

(hasWeb ? describe : describe.skip)('Web版と同じまま持ってきたもの', () => {
  it.each(SHARED)('%s が Web版と同じ', (relative) => {
    const web = join(WEB_ROOT, relative);
    const native = join(NATIVE_ROOT, relative);

    expect(existsSync(web)).toBe(true);
    expect(existsSync(native)).toBe(true);
    expect(read(native)).toBe(read(web));
  });
});
