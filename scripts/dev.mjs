#!/usr/bin/env node
// Dev-server launcher.
//
// Turbopack requires a native (Rust) binding per platform/arch
// (e.g. @next/swc-win32-x64-msvc on Windows x64). If that binary is
// missing, corrupted, or blocked (a known recurring failure mode on
// Windows — antivirus quarantine, interrupted installs, OneDrive/AV
// file locking, etc.), Turbopack cannot start and Next also can't
// safely fall back to it for dev.
//
// Rather than requiring every Windows contributor to remember
// `next dev --webpack`, this script makes Webpack the default dev
// bundler on Windows and Turbopack the default everywhere else.
// Either can be forced explicitly:
//   npm run dev              -> platform default (see below)
//   npm run dev:webpack      -> force Webpack
//   npm run dev:turbo        -> force Turbopack
//   NEXT_DEV_BUNDLER=turbopack npm run dev   -> override on any platform
//   NEXT_DEV_BUNDLER=webpack  npm run dev    -> override on any platform
import { spawn } from "node:child_process";

const forced = process.env.NEXT_DEV_BUNDLER; // "turbopack" | "webpack" | undefined
const isWindows = process.platform === "win32";

const useWebpack = forced
  ? forced === "webpack"
  : isWindows;

const args = ["next", "dev"];
if (useWebpack) args.push("--webpack");

// Forward any extra CLI args (e.g. -p 3001) after our own.
args.push(...process.argv.slice(2));

console.log(
  `[dev] Using ${useWebpack ? "Webpack" : "Turbopack"} (${
    forced ? `forced via NEXT_DEV_BUNDLER=${forced}` : isWindows ? "Windows default" : "non-Windows default"
  })`
);

const child = spawn("npx", args, {
  stdio: "inherit",
  shell: process.platform === "win32",
});

child.on("exit", (code) => process.exit(code ?? 0));
