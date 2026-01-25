import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/types/index.ts", "src/utils/index.ts", "src/leaderboard/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
});
