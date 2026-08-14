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
import { persist } from '@/features/project/lib/persistence';
import { useProjectStore } from '@/features/project/store/useProjectStore';
import { getT, useT } from '@/features/i18n/store/useLocaleStore';
import type { Messages } from '@/features/i18n/messages/ja';
import { upsertPositions } from '@/features/scene/api/positions';

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
  const t = useT();
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

    void (async () => {
      try {
        await persist((client) =>
          upsertPositions(
            client,
            changes.map((change) => change.after),
          ),
        );
        // 全員ぶんを1ステップとして積む（保存できてから）
        useHistoryStore.getState().push({ kind: 'template', changes });

        const leftOut = dancers.length - changes.length;
        const name = formationName(formation.label, t);
        setApplied(
          leftOut > 0
            ? t.formations.appliedPartial(name, leftOut)
            : t.formations.applied(name),
        );
      } catch {
        for (const change of changes) {
          updateDancerPosition(selectedSceneId, change.dancerId, change.before);
        }
        useUIStore.getState().showToast({
          message: getT().formations.failed,
          type: 'error',
        });
      }
    })();
  };

  return (
    <View className="gap-3 rounded-2xl border border-line bg-surface p-4">
      <Text className="text-xs uppercase tracking-widest text-fg-muted">
        {t.formations.section}
        {templates.length > 0 ? t.formations.count(templates.length) : ''}
      </Text>

      {positions.length < 2 ? (
        <Text className="text-xs leading-5 text-fg-muted">{t.formations.needsTwo}</Text>
      ) : templates.length === 0 ? (
        <Text className="text-xs leading-5 text-fg-muted">
          {t.formations.noneForCount(positions.length)}
        </Text>
      ) : (
        <>
          {/* 変形。当てはめる前に決めておく（Web版と同じ並び） */}
          <View className="flex-row flex-wrap gap-2">
            <Toggle
              label={t.formations.flipX}
              value={transform.flipX}
              onPress={() => setTransform({ ...transform, flipX: !transform.flipX })}
            />
            <Toggle
              label={t.formations.flipY}
              value={transform.flipY}
              onPress={() => setTransform({ ...transform, flipY: !transform.flipY })}
            />
            <Toggle
              label={t.formations.rotate}
              value={transform.rotate}
              onPress={() => setTransform({ ...transform, rotate: !transform.rotate })}
            />
            <Spacing
              value={transform.spacing}
              onChange={(spacing) => setTransform({ ...transform, spacing })}
              t={t}
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
                accessibilityLabel={formationName(formation.label, t)}
                className="rounded-xl border border-line bg-surface-raised px-3 py-2 active:opacity-80"
              >
                <Text className="text-sm text-fg-strong">
                  {formationName(formation.label, t)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text className="text-xs leading-5 text-fg-muted">
            {applied ?? t.formations.hint}
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

function Spacing({
  value,
  onChange,
  t,
}: {
  value: FormationSpacing;
  onChange: (next: FormationSpacing) => void;
  t: Messages;
}) {
  const labels: Record<FormationSpacing, string> = {
    narrow: t.formations.spacingNarrow,
    normal: t.formations.spacingNormal,
    wide: t.formations.spacingWide,
  };
  const order: FormationSpacing[] = ['narrow', 'normal', 'wide'];
  return (
    <Pressable
      onPress={() => onChange(order[(order.indexOf(value) + 1) % order.length])}
      accessibilityRole="button"
      accessibilityLabel={t.formations.spacing}
      className="rounded-lg border border-line px-3 py-1.5 active:opacity-80"
    >
      <Text className="text-xs text-fg-muted">
        {t.formations.spacing}: {labels[value]}
      </Text>
    </Pressable>
  );
}

/**
 * 隊形の呼び名。
 *
 * テンプレートは**名前ではなく鍵**（形＋人数の内訳）で持っている。
 * ここで辞書を引くので、言語を変えれば隊形名も一緒に変わる
 * （Web版 formationName.ts と同じ作り）。
 */
function formationName(label: FormationLabel, t: Messages): string {
  const name = t.formationNames[label.shape];
  return typeof name === 'function' ? name(label.rows ?? []) : name;
}
