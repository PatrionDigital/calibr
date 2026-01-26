import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/types/index.ts", "src/utils/index.ts", "src/leaderboard/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  // Mark eas-sdk as external since we use createRequire for CommonJS interop
  // Also exclude node:module builtin
  external: ["@ethereum-attestation-service/eas-sdk", "module"],
});
