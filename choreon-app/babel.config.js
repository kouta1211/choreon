/**
 * NativeWind を通すための Babel。
 *
 * `jsxImportSource: "nativewind"` で、JSX の変換先を NativeWind の
 * ラッパーにする。これで React Native の <View> にも className が付く
 * (React Native 自体は className を知らない)。
 */
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
  };
};
