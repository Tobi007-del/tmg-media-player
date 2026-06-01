import { defineConfig, type Options } from "tsup";
import path from "node:path";
import { sassPlugin } from "esbuild-sass-plugin";

const isProd = process.env.NODE_ENV === "production" || process.argv.includes("--prod");
const config: Options = {
  dts: { compilerOptions: { incremental: false } },
  target: "es2020",
  platform: "browser",
  minify: isProd,
  sourcemap: !isProd,
  esbuildPlugins: [sassPlugin({ loadPaths: [path.resolve(import.meta.dirname, "node_modules")] })],
};

export default defineConfig([
  // 1. The NPM Build (ESM)
  {
    entry: {
      index: "src/ts/index.ts",
    },
    format: ["esm", "cjs"],
    clean: true,
    ...config,
  },
  // 2. The Browser IIFE Build
  {
    entry: ["src/ts/super.ts"],
    format: ["iife"],
    globalName: "tmg",
    noExternal: ["sia-reactor", /@t007/],
    ...config,
    onSuccess: async () => console.log("\x1b[38;2;139;69;19mTMG Media Player\x1b[0m is ready to serve :)"),
  },
]);
