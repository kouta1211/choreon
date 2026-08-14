import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

import { useMusicStore } from '@/features/music/store/useMusicStore';
import { usePlaybackStore } from '@/features/music/store/usePlaybackStore';
import { useUIStore } from '@/features/canvas/store/useUIStore';

/**
 * 曲を選ぶ。
 *
 * ■ 選んだ瞬間に再生の時計が入れ替わる
 * 曲があるときは音の再生位置が時刻の正になる（`useMusicPlayback`）。
 * 選ぶ前に作った振付の秒数はそのままなので、曲を載せた時点で
 * 「何秒目に何をするか」は変わらない。
 *
 * ■ まだ端末に覚えない
 * ピッカーが渡してくる場所は一時的で、アプリを開き直すと消えていることが
 * ある。**アプリの領域へ複写して覚える**のが正しい直し方だが、それは実機で
 * 1周確かめてからにする（`useMusicStore` の注）。
 *
 * ■ 選び直し・外す
 * 曲を外すと、時計は曲なしの方（`useSilentClock`）へ戻る。どちらも同じ場所へ
 * 秒を書くので、画面側は何も変わらない。
 */
export function MusicPicker() {
  const uri = useMusicStore((state) => state.uri);
  const name = useMusicStore((state) => state.name);
  const setMusic = useMusicStore((state) => state.setMusic);
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
      setMusic({ uri: file.uri, name: file.name });
    } catch {
      setError('曲を読み込めませんでした');
    }
  };

  const clear = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    setMusic(null);
  };

  return (
    <View className="gap-3 rounded-2xl border border-line bg-surface p-4">
      <Text className="text-xs uppercase tracking-widest text-fg-muted">曲</Text>

      {uri ? (
        <View className="flex-row items-center gap-3">
          <Text className="flex-1 text-sm text-fg-strong" numberOfLines={1}>
            {name}
          </Text>
          <Pressable
            onPress={clear}
            accessibilityRole="button"
            accessibilityLabel="曲を外す"
            className="rounded-lg border border-line-strong px-3 py-1.5 active:opacity-80"
          >
            <Text className="text-sm text-fg">外す</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={() => void pick()}
          accessibilityRole="button"
          accessibilityLabel="曲を選ぶ"
          className="items-center rounded-xl bg-accent py-3 active:opacity-80"
        >
          <Text className="text-base font-semibold text-accent-fg">♪ 曲を選ぶ</Text>
        </Pressable>
      )}

      {error ? <Text className="text-sm text-[#f87171]">{error}</Text> : null}

      <Text className="text-xs leading-5 text-fg-muted">
        {uri
          ? '「通しで見る」を押すと、いま選んでいるシーンの秒から鳴ります。曲がある間は、時計は曲そのものです（ずれません）。'
          : '曲を入れると、通し再生の時計が曲になります。入れなくても秒だけで通せます。アプリを開き直すと選び直しです。'}
      </Text>
    </View>
  );
}
