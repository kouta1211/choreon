/**
 * Metro(React Native のバンドラ)に NativeWind を噛ませる。
 *
 * `input` に渡した CSS が、Tailwind のビルドの入口になる。ここを通った
 * クラス名が、Web ではそのまま CSS に、ネイティブでは style オブジェクトに
 * 変換される。
 */
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: "./src/global.css" });
