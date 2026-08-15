import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

import { useMusicStore } from '@/features/music/store/useMusicStore';
import { useProjectStore } from '@/features/project/store/useProjectStore';
import { usePlaybackStore } from '@/features/music/store/usePlaybackStore';
import { useUIStore } from '@/features/canvas/store/useUIStore';
import { useT } from '@/features/i18n/store/useLocaleStore';

/**
 * 曲を選ぶ。
 *
 * ■ 選んだ瞬間に再生の時計が入れ替わる
 * 曲があるときは音の再生位置が時刻の正になる（`useMusicPlayback`）。
 * 選ぶ前に作った振付の秒数はそのままなので、曲を載せた時点で
 * 「何秒目に何をするか」は変わらない。
 *
 * ■ 端末に覚える（作品ごとに1曲）
 * ピッカーが渡してくる場所はキャッシュで、端末が容量を空けるときに消える。
 * **アプリの領域へ写して、その場所を覚える**（`musicStorage.ts`）。
 * 次に同じ作品を開けば、選び直さずに鳴らせる。
 *
 * ■ 選び直し・外す
 * 曲を外すと、時計は曲なしの方（`useSilentClock`）へ戻る。どちらも同じ場所へ
 * 秒を書くので、画面側は何も変わらない。
 */
export function MusicPicker() {
  const t = useT();
  const uri = useMusicStore((state) => state.uri);
  const name = useMusicStore((state) => state.name);
  const pickMusic = useMusicStore((state) => state.pick);
  const clearMusic = useMusicStore((state) => state.clear);
  const projectId = useProjectStore((state) => state.project?.id);
  const setIsPlaying = useUIStore((state) => state.setIsPlaying);
  const setCurrentTime = usePlaybackStore((state) => state.setCurrentTime);
  const [error, setError] = useState<string | null>(null);

  const pick = async () => {
    setError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        // 選んだファイルをアプリのキャッシュへ写してもらう。写さないと、
        // 端末によっては読めない場所の URI がそのまま返ってくる
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;

      const file = result.assets[0];
      if (!file) return;

      // 曲を変えたら時計は頭へ。前の曲の秒数のまま鳴らし始めない
      setIsPlaying(false);
      setCurrentTime(0);
      await pickMusic(projectId ?? 'local', { uri: file.uri, name: file.name });
    } catch {
      setError(t.music.failed);
    }
  };

  const clear = async () => {
    setIsPlaying(false);
    setCurrentTime(0);
    await clearMusic();
  };

  return (
    <View className="gap-3 rounded-2xl border border-line bg-surface p-4">
      <Text className="text-xs uppercase tracking-widest text-fg-muted">{t.music.section}</Text>

      {uri ? (
        <View className="flex-row items-center gap-3">
          <Text className="flex-1 text-sm text-fg-strong" numberOfLines={1}>
            {name}
          </Text>
          <Pressable
            onPress={() => void clear()}
            accessibilityRole="button"
            accessibilityLabel={t.music.clear}
            className="rounded-lg border border-line-strong px-3 py-1.5 active:opacity-80"
          >
            <Text className="text-sm text-fg">{t.music.clear}</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={() => void pick()}
          accessibilityRole="button"
          accessibilityLabel={t.music.pick}
          className="items-center rounded-xl bg-accent py-3 active:opacity-80"
        >
          <Text className="text-base font-semibold text-accent-fg">{t.music.pick}</Text>
        </Pressable>
      )}

      {error ? <Text className="text-sm text-[#f87171]">{error}</Text> : null}

      <Text className="text-xs leading-5 text-fg-muted">
        {uri ? t.music.withMusic : t.music.withoutMusic}
      </Text>
      <Text className="text-xs leading-5 text-fg-muted">{t.music.kept}</Text>
    </View>
  );
}
