import { Pressable, Text, View } from 'react-native';

import { Segment } from '@/components/ui/button';
import {
  SettingsGroup,
  SettingsNumberRow,
  SettingsSwitchRow,
} from '@/components/ui/settings-row';
import { useUIStore } from '@/features/canvas/store/useUIStore';
import { useT } from '@/features/i18n/store/useLocaleStore';
import { useSongSettings } from '@/features/music/hooks/useSongSettings';
import {
  MAX_BPM,
  MAX_MUSIC_OFFSET_SECONDS,
  MIN_BPM,
} from '@/features/music/lib/bpmRange';

/** 押すだけで置ける速さ。バラード〜アップテンポの目安（Web版と同じ4つ） */
const BPM_PRESETS = [90, 110, 128, 140];

/** 選べる拍子。4は既定、3はワルツ系、6は「2拍3連で数える曲」 */
const BEATS_CHOICES = [4, 3, 6];

/**
 * 曲に合わせる（速さ・拍子・曲の開始位置）。曲のシートの中。
 *
 * ■ なぜ要ったか
 * メトロノームも予備拍も、**作品の** BPM・拍子・開始位置を読んでいたのに、
 * それを変える場所がどこにも無かった。作った時の 120／4拍子／0秒のまま
 * 動かせず、実際の曲に合わせられない。鳴らす仕掛けだけがあって、
 * 合わせる手段が無い状態だった。
 *
 * ■ 設定シートではなく曲のシートに置く
 * 設定 → 再生 にある「既定の速さ」は**これから作る作品**の初期値で、
 * ここは**いま開いている作品**の値。名前が似ていて中身が違うので、
 * 隣に並べると必ず取り違える。触る場面（曲を入れて頭出しをする）が
 * 同じものと一緒にした。
 *
 * ■ スライダーを使わない
 * React Native に素の Slider が無く、入れるほどの場面でもない。
 * よく使う4つを押せるようにして、細かい値は数字で打つ
 * （Web版はスライダー＋プリセット。押せる値は同じ）。
 */
export function SongSettings() {
  const t = useT();
  const { bpm, beatsPerBar, musicOffsetSeconds, hasProject, setBpm, setBeatsPerBar, setMusicOffset } =
    useSongSettings();

  const isMetronomeEnabled = useUIStore((state) => state.isMetronomeEnabled);
  const toggleMetronome = useUIStore((state) => state.toggleMetronome);

  if (!hasProject) return null;

  return (
    <SettingsGroup description={t.song.description}>
      {/* 鳴らすかどうかだけは【端末】の好み。稽古場か電車かで変わるもので、
          作品には入らない。ここに置くのは、速さを決めるときに耳で
          確かめられないと意味がないため */}
      <SettingsSwitchRow
        label={t.playback.metronome}
        description={t.song.metronomeNote}
        checked={isMetronomeEnabled}
        onChange={toggleMetronome}
      />

      <SettingsNumberRow
        label={t.song.bpm}
        description={t.song.bpmNote}
        value={bpm}
        min={MIN_BPM}
        max={MAX_BPM}
        unit={t.song.bpmUnit}
        onChange={setBpm}
      />

      {/* 数字だけだと、速いのか遅いのかの見当が付かない */}
      <View className="flex-row flex-wrap items-center gap-1.5 px-4 pb-3">
        {BPM_PRESETS.map((preset) => {
          const isOn = bpm === preset;
          return (
            <Pressable
              key={preset}
              onPress={() => setBpm(preset)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isOn }}
              aria-selected={isOn}
              accessibilityLabel={t.song.presetLabel(preset)}
              className={`h-8 justify-center rounded-full border px-3 active:opacity-70 ${
                isOn ? 'border-accent bg-accent-row' : 'border-line-strong'
              }`}
            >
              <Text
                className={`font-mono text-xs ${isOn ? 'text-accent-soft' : 'text-fg-sub'}`}
              >
                {preset}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View className="min-h-11 gap-2 px-4 py-3">
        <View className="flex-row items-center gap-4">
          <Text className="min-w-0 flex-1 text-base text-fg-strong">{t.song.beatsPerBar}</Text>
          <Segment
            value={beatsPerBar}
            options={BEATS_CHOICES.map((choice) => ({
              value: choice,
              label: t.song.beatsOption(choice),
            }))}
            onChange={setBeatsPerBar}
            accessibilityLabel={t.song.beatsPerBar}
          />
        </View>
        <Text className="text-xs leading-snug text-fg-muted">{t.song.beatsNote}</Text>
      </View>

      <SettingsNumberRow
        label={t.song.offset}
        description={t.song.offsetNote}
        value={musicOffsetSeconds}
        min={0}
        max={MAX_MUSIC_OFFSET_SECONDS}
        unit={t.song.seconds}
        onChange={setMusicOffset}
      />
    </SettingsGroup>
  );
}
