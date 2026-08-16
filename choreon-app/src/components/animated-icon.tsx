import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, Keyframe } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

const DURATION = 600;

/**
 * 起動時の絵から、アプリの画面へ渡すあいだの覆い。
 *
 * ■ なぜ要るか
 * OS が出す起動画面（`expo-splash-screen`）は、React が描き始めた瞬間に
 * 消える。そのままだと **一瞬だけ地の色が出てから中身が来る** ので、
 * 同じ絵をこちらでもう一度出して、消えるところだけを受け持つ。
 *
 * ■ 中身は Choreon のもの
 * ここは Expo の見本のままで、**青地に Expo のロゴ**が出ていた
 * （回る Expo ロゴを描く AnimatedIcon も残っていたが、どこからも
 * 使われていなかったので落とした）。絵と地の色は app.json の
 * 起動画面と同じものを使う — 2枚が入れ替わったことに気づかせないため。
 */
export function AnimatedSplashOverlay() {
  const [animate, setAnimate] = useState(false);
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  const splashKeyframe = new Keyframe({
    0: {
      transform: [{ scale: 1 }],
      opacity: 1,
    },
    20: {
      opacity: 1,
    },
    70: {
      opacity: 0,
      easing: Easing.elastic(0.7),
    },
    100: {
      opacity: 0,
      transform: [{ scale: 1 }],
      easing: Easing.elastic(0.7),
    },
  });

  const image = <Image style={styles.image} source={require('@/assets/images/splash-icon.png')} />;

  return animate ? (
    <Animated.View
      entering={splashKeyframe.duration(DURATION).withCallback((finished) => {
        'worklet';
        if (finished) {
          scheduleOnRN(setVisible, false);
        }
      })}
      style={styles.splashOverlay}>
      {image}
    </Animated.View>
  ) : (
    <View
      onLayout={() => {
        SplashScreen.hideAsync().finally(() => {
          setAnimate(true);
        });
      }}
      style={styles.splashOverlay}>
      {image}
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    width: 128,
    height: 128,
  },
  splashOverlay: {
    ...StyleSheet.absoluteFill,
    // app.json の起動画面と同じ地の色。ここがずれると、2枚の絵が
    // 入れ替わる瞬間に地の色が瞬く
    backgroundColor: '#19191c',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
});
