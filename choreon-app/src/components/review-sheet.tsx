import { useState } from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { useUIStore } from '@/features/canvas/store/useUIStore';
import { useT } from '@/features/i18n/store/useLocaleStore';
import { useProjectStore } from '@/features/project/store/useProjectStore';
import { buildFormationSummary } from '@/features/review/lib/formationSummary';
import { useThemeColor } from '@/features/theme/lib/useThemeColor';
import { supabase } from '@/lib/supabase/client';

/** 診断を頼む先。Web版と同じルート（鍵はサーバーの外へ出ない） */
const REVIEW_URL = `${process.env.EXPO_PUBLIC_SITE_URL ?? 'https://choreon.vercel.app'}/api/review`;

/**
 * いま選んでいるシーンの隊形を見てもらう。Web版 ReviewSheet の翻訳。
 *
 * ■ なぜサーバーを通すのか
 * 診断は Gemini に頼んでいて、その鍵は**サーバーの環境変数から出さない**。
 * `EXPO_PUBLIC_` を付けて配ると、バンドルを開けば誰でも読める場所に鍵が
 * 置かれる。Web版が用意しているルートへ、こちらからも頼む。
 *
 * ■ 認証はヘッダで渡す
 * ブラウザは Cookie を自動で付けるが、こちらにその仕組みは無い。
 * セッションは端末のストレージにあるので、**アクセストークンをヘッダで
 * 送る**。Web版のルートは、Cookie で通らなかったときだけこれを見る
 * （既存の道は触っていない）。
 *
 * ■ ブラウザ（Expo web）からは通らない
 * 頼む先は別の場所（choreon.vercel.app）なので、ブラウザが止める（CORS）。
 * **実機の fetch にはその制限が無い**ので、スマホからは通る。
 * ここで「電波を確かめてください」と出すのは嘘になるので、押す前に
 * そう書いて、押せなくしてある。ルート側へ許可を足せば通せるが、
 * **回数が課金に効く口**を誰からでも叩ける形にはしたくない。
 *
 * ■ 送るのは隊形の要約だけ
 * 作品名も、ダンサーの色も、id も送らない。座標はセンター原点に直して
 * から渡す（`formationSummary.ts` — Web版と同じものを使っている）。
 */
export function ReviewSheet() {
  const t = useT();
  const danger = useThemeColor('--dancer-2');

  const project = useProjectStore((state) => state.project);
  const scenes = useProjectStore((state) => state.scenes);
  const dancers = useProjectStore((state) => state.dancers);
  const positionsBySceneId = useProjectStore((state) => state.positionsBySceneId);
  const selectedSceneId = useUIStore((state) => state.selectedSceneId);

  const [isRunning, setIsRunning] = useState(false);
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** ブラウザからは頼めない（別の場所への呼び出しをブラウザが止める） */
  const isBlockedHere = Platform.OS === 'web';

  const index = scenes.findIndex((scene) => scene.id === selectedSceneId);
  const scene = index >= 0 ? scenes[index] : null;

  const run = async () => {
    if (!scene || !project) return;
    setIsRunning(true);
    setError(null);
    setText(null);

    try {
      const summary = buildFormationSummary({
        scene,
        previousScene: scenes[index - 1] ?? null,
        nextScene: scenes[index + 1] ?? null,
        dancers,
        positions: positionsBySceneId[scene.id] ?? {},
        nextPositions: scenes[index + 1]
          ? (positionsBySceneId[scenes[index + 1].id] ?? {})
          : {},
        stageWidth: project.stageWidth,
        stageHeight: project.stageHeight,
      });

      // ログインしていないと断られる。**手前で止めない** — 断りの文言は
      // サーバーが画面と同じ言語で返すので、そちらに任せる
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      const response = await fetch(REVIEW_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ summary }),
      });
      const result = (await response.json()) as { text?: string; error?: string };

      if (!response.ok || !result.text) {
        setError(result.error ?? t.review.failed);
        return;
      }
      setText(result.text);
    } catch {
      setError(t.review.offline);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <View className="gap-3">
      <Text className="text-sm leading-5 text-fg-sub">{t.review.description}</Text>

      {isBlockedHere ? (
        <View className="gap-1 rounded-2xl border border-line bg-surface-raised p-4">
          <Text className="text-sm leading-5 text-fg-sub">{t.review.onlyOnDevice}</Text>
        </View>
      ) : (
        <Button
          label={scene ? t.review.run(scene.name) : t.review.pickScene}
          kind="primary"
          onPress={() => void run()}
          disabled={isRunning || !scene}
        />
      )}

      {isRunning ? <ActivityIndicator /> : null}

      {text ? (
        <View className="gap-1 rounded-2xl border border-line bg-surface-raised p-4">
          <Text className="text-sm leading-6 text-fg-strong">{text}</Text>
        </View>
      ) : null}

      {error ? (
        <Text className="text-sm" style={{ color: danger }}>
          {error}
        </Text>
      ) : null}

      <Text className="text-xs leading-5 text-fg-muted">{t.review.note}</Text>
    </View>
  );
}
