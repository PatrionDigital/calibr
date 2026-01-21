import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/polymarket/index.ts",
    "src/sync/index.ts",
    "src/matching/index.ts",
    "src/cache/index.ts",
    "src/feeds/index.ts",
    "src/resolution/index.ts",
  ],
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
});
