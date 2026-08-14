import path from "node:path";
import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./vitest.setup.ts",
    // choreon-app はネイティブ版(Expo)。テストの走らせ方が別なので、
    // ルートの vitest では拾わない
    exclude: [...configDefaults.exclude, ".next/**", "choreon-app/**"],
    passWithNoTests: true,
  },
});
