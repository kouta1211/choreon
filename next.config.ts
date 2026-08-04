import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 親ディレクトリのpackage-lock.jsonをNext.jsがworkspace rootと誤検出するため明示指定
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
