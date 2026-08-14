import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import {
  assignDancersToPoints,
  DEFAULT_TRANSFORM,
  formationKey,
  resolveFormationPoints,
  selectPointsForDancers,
  templatesForCount,
  type FormationLabel,
  type FormationSpacing,
  type FormationTemplate,
  type FormationTransform,
} from '@/features/canvas/lib/formationTemplates';
import { useHistoryStore } from '@/features/canvas/store/useHistoryStore';
import { useUIStore } from '@/features/canvas/store/useUIStore';
import { useProjectStore } from '@/features/project/store/useProjectStore';

type Props = {
  stageWidthUnits: number;
  stageHeightUnits: number;
};

/**
 * よくある隊形を、いまのシーンへ当てはめる。
 *
 * ■ 形も、誰がどこへ入るかも、Web版の関数がそのまま決める
 * `formationTemplates.ts`（59種の座標・反転や間隔の変形・いまの位置から
 * いちばん近い点への割り当て）を**テストごとコピー**して呼んでいる。
 * 同じ作品を Web とスマホで開いたときに、同じ「V字」が違う形になっては困る。
 *
 * ■ 余る人はいまの位置に残す
 * 点より人が多いときに勝手に端へ寄せると、意図して外していた人まで動く
 * （Web版 useApplyTemplate と同じ）。
 *
 * ■ 履歴は全員ぶんで1ステップ
 * 一度に全員が動く操作なので、戻すときも一度で戻せないと使えない。
 */
export function FormationSheet({ stageWidthUnits, stageHeightUnits }: Props) {
  const positionsBySceneId = useProjectStore((state) => state.positionsBySceneId);
  const updateDancerPosition = useProjectStore((state) => state.updateDancerPosition);
  const selectedSceneId = useUIStore((state) => state.selectedSceneId);

  const [transform, setTransform] = useState<FormationTransform>(DEFAULT_TRANSFORM);
  const [applied, setApplied] = useState<string | null>(null);

  const positions = selectedSceneId
    ? Object.values(positionsBySceneId[selectedSceneId] ?? {})
    : [];
  const templates = templatesForCount(positions.length);

  const apply = (formation: FormationTemplate) => {
    if (!selectedSceneId) return;
    const dancers = positions.map((position) => ({
      dancerId: position.dancerId,
      x: position.xCoordinate,
      y: position.yCoordinate,
    }));

    const points = resolveFormationPoints(
      formation.points,
      transform,
      stageWidthUnits,
      stageHeightUnits,
    );
    const usedPoints = selectPointsForDancers(points, dancers.length);
    const assignments = assignDancersToPoints(dancers, usedPoints);

    const byId = Object.fromEntries(positions.map((p) => [p.dancerId, p]));
    const changes = assignments.flatMap((assignment) => {
      const before = byId[assignment.dancerId];
      if (!before) return [];
      const after = {
        ...before,
        xCoordinate: assignment.x,
        yCoordinate: assignment.y,
      };
      return [{ sceneId: selectedSceneId, dancerId: assignment.dancerId, before, after }];
    });
    if (changes.length === 0) return;

    for (const change of changes) {
      updateDancerPosition(selectedSceneId, change.dancerId, change.after);
    }
    useHistoryStore.getState().push({ kind: 'template', changes });

    const leftOut = dancers.length - changes.length;
    setApplied(
      leftOut > 0
        ? `${formationName(formation.label)} にしました（余る${leftOut}人はそのまま）`
        : `${formationName(formation.label)} にしました`,
    );
  };

  return (
    <View className="gap-3 rounded-2xl border border-line bg-surface p-4">
      <Text className="text-xs uppercase tracking-widest text-fg-muted">
        フォーメーション{templates.length > 0 ? `（${templates.length}種）` : ''}
      </Text>

      {positions.length < 2 ? (
        <Text className="text-xs leading-5 text-fg-muted">
          隊形を選ぶには、このシーンに<Text className="text-fg-sub">2人以上</Text>
          立っている必要があります。
        </Text>
      ) : templates.length === 0 ? (
        <Text className="text-xs leading-5 text-fg-muted">
          {positions.length}人ぶんの形はまだ用意していません（2〜10人ぶんがあります）。
        </Text>
      ) : (
        <>
          {/* 変形。当てはめる前に決めておく（Web版と同じ並び） */}
          <View className="flex-row flex-wrap gap-2">
            <Toggle
              label="左右反転"
              value={transform.flipX}
              onPress={() => setTransform({ ...transform, flipX: !transform.flipX })}
            />
            <Toggle
              label="前後反転"
              value={transform.flipY}
              onPress={() => setTransform({ ...transform, flipY: !transform.flipY })}
            />
            <Toggle
              label="90度回す"
              value={transform.rotate}
              onPress={() => setTransform({ ...transform, rotate: !transform.rotate })}
            />
            <Spacing
              value={transform.spacing}
              onChange={(spacing) => setTransform({ ...transform, spacing })}
            />
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-2 pr-2"
          >
            {templates.map((formation) => (
              <Pressable
                key={formationKey(formation.label)}
                onPress={() => apply(formation)}
                accessibilityRole="button"
                accessibilityLabel={formationName(formation.label)}
                className="rounded-xl border border-line bg-surface-raised px-3 py-2 active:opacity-80"
              >
                <Text className="text-sm text-fg-strong">
                  {formationName(formation.label)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text className="text-xs leading-5 text-fg-muted">
            {applied ?? 'いまの位置からいちばん近い点へ入ります。戻すときは「元に戻す」で一度に戻せます'}
          </Text>
        </>
      )}
    </View>
  );
}

function Toggle({
  label,
  value,
  onPress,
}: {
  label: string;
  value: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: value }}
      className={`rounded-lg px-3 py-1.5 active:opacity-80 ${
        value ? 'bg-accent-row border border-accent' : 'border border-line'
      }`}
    >
      <Text className={`text-xs ${value ? 'text-accent-soft' : 'text-fg-muted'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

const SPACING_LABELS: Record<FormationSpacing, string> = {
  narrow: '狭め',
  normal: 'ふつう',
  wide: '広め',
};

function Spacing({
  value,
  onChange,
}: {
  value: FormationSpacing;
  onChange: (next: FormationSpacing) => void;
}) {
  const order: FormationSpacing[] = ['narrow', 'normal', 'wide'];
  return (
    <Pressable
      onPress={() => onChange(order[(order.indexOf(value) + 1) % order.length])}
      accessibilityRole="button"
      accessibilityLabel="間隔"
      className="rounded-lg border border-line px-3 py-1.5 active:opacity-80"
    >
      <Text className="text-xs text-fg-muted">間隔: {SPACING_LABELS[value]}</Text>
    </Pressable>
  );
}

/**
 * 隊形の呼び名。
 *
 * テンプレートは**名前ではなく鍵**（形＋人数の内訳）で持っている。
 * Web版はそれを i18n の辞書で引くが、ネイティブ版はまだ辞書を持って
 * いないので、ここに日本語だけ置く（**Web版 ja.ts と同じ文言**）。
 * 辞書を移すときにこの関数は消す。
 */
function formationName(label: FormationLabel): string {
  const rows = label.rows ?? [];
  switch (label.shape) {
    case 'row':
      return '横1列';
    case 'rowPair':
      return '横並び';
    case 'rowFront':
      return '前寄せ横並び';
    case 'rowBack':
      return '奥寄せ横並び';
    case 'column':
      return '縦1列';
    case 'columnPair':
      return '縦1列（前後）';
    case 'diagonal':
      return '斜め';
    case 'diagonalLine':
      return '斜め列';
    case 'lShape':
      return 'L字';
    case 'xShape':
      return 'X字';
    case 'wShape':
      return 'W字（ジグザグ）';
    case 'diamond':
      return 'ダイヤ';
    case 'circle':
      return '円（サークル）';
    case 'circleCenter':
      return '円＋センター';
    case 'arc':
      return '弧（アーチ）';
    case 'wedgeIn':
      return 'ハの字（後狭・前広）';
    case 'wedgeOut':
      return 'くさび（後広・前狭）';
    case 'triangle':
      return `三角（後${rows[0]}・前${rows[1]}）`;
    case 'triangleDown':
      return `逆三角（後${rows[0]}・前${rows[1]}）`;
    case 'v':
      return `V字（後${rows.join('-')}前）`;
    case 'vDown':
      return `逆V字（後${rows.join('-')}前）`;
    case 'twoRows':
      return `2列（${rows.join('-')}）`;
    case 'twoColumns':
      return `縦2列（${rows.join('-')}）`;
    case 'stagger':
      return `千鳥（${rows.join('-')}）`;
    case 'arcRows':
      return `弧2列（${rows.join('-')}）`;
    case 'grid':
      return `${rows[0]}×${rows[1]} グリッド`;
  }
}
