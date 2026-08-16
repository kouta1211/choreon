import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SwitchTrack } from '@/components/ui/switch';
import { useUIStore } from '@/features/canvas/store/useUIStore';
import { useT } from '@/features/i18n/store/useLocaleStore';

type Props = {
  /** ゲストの下書きで始める */
  onGuestStart: () => void;
  /** ログインの入口（設定のアカウント）を開く */
  onOpenAccount: () => void;
};

/**
 * 未ログインで開いたときに最初に出る、始め方を選ぶ画面。
 * Web版 WelcomeScreen の翻訳。
 *
 * ■ なぜ挟むのか
 * これまではいきなりゲストの下書きが始まっていた。「まず作ってもらってから
 * 登録を求める」という狙いは正しいが、**始め方が選択になっていない**ため、
 * 開いた人は何が起きたのか分からず、既にアカウントを持っている人は
 * ログインの入り口を探すことになる。一拍置いて、道を見せる。
 *
 * ■ ログインは【設定のアカウント】へ送る
 * Web版はモーダルを1つ持っていて、ここからは開く合図を出すだけで済む。
 * こちらに同じモーダルは無く、入力欄は設定 → アカウントに常にある。
 * **同じものを2つ作らない**（合わせて2箇所を直すことになる）ので、
 * そこを開くだけにした。
 *
 * ■ 案内を見るかどうかは、押す前に選ばせる
 * 押したあとに「見ますか？」を出すと、通る門が1枚増えるだけになる
 * （Web版と同じ判断）。既定は「見る」。端末に覚えてある「もう見た」を
 * 初期値にはしない — 要らない人が1回外す、という形に倒してある。
 */
export function WelcomeScreen({ onGuestStart, onOpenAccount }: Props) {
  const t = useT();
  const setGuestTourIntent = useUIStore((state) => state.setGuestTourIntent);
  const [wantsTour, setWantsTour] = useState(true);

  const startAsGuest = () => {
    setGuestTourIntent(wantsTour ? 'show' : 'skip');
    onGuestStart();
  };

  return (
    <SafeAreaView className="flex-1 justify-center bg-page px-6">
      <View className="w-full max-w-[420px] gap-8 self-center">
        <View className="gap-1.5">
          <Text className="text-center text-3xl text-fg-strong">{t.app.title}</Text>
          <Text className="text-center text-sm text-fg-sub">{t.welcome.tagline}</Text>
        </View>

        <View className="gap-3">
          <Pressable
            onPress={startAsGuest}
            accessibilityRole="button"
            className="min-h-14 items-center justify-center rounded-xl bg-accent active:opacity-80"
          >
            <Text className="text-base font-semibold text-accent-fg">
              {t.welcome.guestStart}
            </Text>
          </Pressable>

          {/* ラベルまで含めて的にする（44px 以上） */}
          <Pressable
            onPress={() => setWantsTour(!wantsTour)}
            accessibilityRole="switch"
            accessibilityState={{ checked: wantsTour }}
            aria-checked={wantsTour}
            accessibilityLabel={t.welcome.withTour}
            className="min-h-11 flex-row items-center gap-3 active:opacity-70"
          >
            <SwitchTrack checked={wantsTour} />
            <Text className="min-w-0 flex-1 text-sm text-fg-sub">{t.welcome.withTour}</Text>
          </Pressable>

          {/* 「登録なしで始められる」ことと「消えること」は同じ重さで伝える。
              後者を伏せると、作った後で裏切ることになる。だから添え物の色
              （fg-muted）ではなく fg-sub で書く */}
          <Text className="text-center text-sm leading-relaxed text-fg-sub">
            {t.welcome.guestNote}
          </Text>
        </View>

        <View className="flex-row items-center gap-3">
          <View className="h-px flex-1 bg-line" />
          <Text className="text-xs text-fg-muted">{t.welcome.or}</Text>
          <View className="h-px flex-1 bg-line" />
        </View>

        <Pressable
          onPress={onOpenAccount}
          accessibilityRole="button"
          className="min-h-12 items-center justify-center rounded-xl border border-line bg-surface-raised active:opacity-70"
        >
          <Text className="text-base text-fg-strong">{t.welcome.signIn}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
