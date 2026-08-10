import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 親ディレクトリのpackage-lock.jsonをNext.jsがworkspace rootと誤検出するため明示指定
  turbopack: {
    root: path.resolve(__dirname),
  },
  // スマホ実機での確認用。next devはlocalhost以外のoriginから開発用アセットへ
  // 来るリクエストを既定で塞ぐため、同じWi-Fi上のこのPCのアドレスを許す。
  // 開発時にしか読まれない設定なので、本番の公開範囲には影響しない。
  // DHCPでアドレスが変わったら書き換える(ipconfigのIPv4アドレス)
  allowedDevOrigins: ["192.168.0.8"],
};

export default nextConfig;
