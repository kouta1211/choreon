import { Text, View } from 'react-native';

import { useSettingsStore } from '@/features/settings/store/useSettingsStore';

type Props = {
  stageWidthUnits: number;
  stageHeightUnits: number;
};

/** センターから振る番号の上限。これより外はステージの角に近く、
 * 目盛りとして読ませる価値より紛らわしさが勝つ（Web版と同じ値） */
const MAX_MARK = 6;

/**
 * バミリ — 客席側の縁に貼る目盛り。
 *
 * 稽古場では舞台の前縁にテープを貼り、センターを0として下手・上手へ
 * 1、2、3…と番号を振る。「センターから下手3」のように、位置を言葉で
 * 受け渡すための共通の物差しになる。同じものを画面の下端に置く。
 *
 * 【固定】であることが要点。ダンサーやシーンによって変わらないので、
 * どのシーンを見ていても同じ目盛りがそこにある。
 *
 * 中央から左右へ同じ番号が伸びる(…3 2 1 0 1 2 3…)。左右で番号を続けて
 * 振らないのは、舞台の呼び方がセンター基準の左右対称だから。
 *
 * Web版 StageMarks.tsx の考え方と数値をそのまま写している。SVG は要らない
 * （線も数字も View と Text で置ける）。
 */
export function StageMarks({ stageWidthUnits, stageHeightUnits }: Props) {
  // 客席がどちらの縁にあるか。バミリは客席側の縁に貼るものなので、
  // 前後を入れ替えて見ているときは反対の縁へ回る
  const isAudienceOnTop = useSettingsStore((state) => state.isAudienceOnTop);
  const center = stageWidthUnits / 2;
  const steps = Math.min(MAX_MARK, Math.floor(center));

  const marks: { key: string; xUnits: number; label: number }[] = [
    { key: 'c', xUnits: center, label: 0 },
  ];
  for (let step = 1; step <= steps; step += 1) {
    marks.push({ key: `l${step}`, xUnits: center - step, label: step });
    marks.push({ key: `r${step}`, xUnits: center + step, label: step });
  }

  return (
    <View pointerEvents="none" className="absolute inset-0">
      {marks.map((mark) => {
        const isCenter = mark.label === 0;
        return (
          <View
            key={mark.key}
            className="absolute items-center"
            style={{
              left: `${(mark.xUnits / stageWidthUnits) * 100}%`,
              // 貼るのは客席側の縁。客席を上にしているときは上端へ回り、
              // 線と数字の上下も入れ替える（縁から内側へ伸びる）
              [isAudienceOnTop ? 'top' : 'bottom']: 0,
              flexDirection: isAudienceOnTop ? 'column-reverse' : 'column',
              // 自分の幅の半分だけ左へ寄せて、線が目盛りの位置に来るようにする
              // （Web版の translate: -50% にあたる。RN に % の translate は無い）
              marginLeft: -10,
              width: 20,
            }}
          >
            <View
              className={isCenter ? 'bg-accent' : 'bg-stage-grid'}
              style={{
                width: isCenter ? 2 : 1,
                // センターだけ長くして、遠目にも中心が拾える
                height: `${((isCenter ? 1.1 : 0.55) / stageHeightUnits) * 100}%`,
                opacity: isCenter ? 0.7 : 0.9,
              }}
            />
            <Text
              className={`font-mono text-[9px] leading-none ${
                isCenter ? 'font-bold text-accent-soft' : 'text-fg-sub'
              }`}
              style={isAudienceOnTop ? { paddingTop: 3 } : { paddingBottom: 3 }}
            >
              {mark.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
