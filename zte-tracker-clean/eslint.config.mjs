import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Not a real TypeScript module despite the .ts extension — a
    // documentation-only "patch notes" file, never imported anywhere
    // (see tsconfig.json's exclude for the same file, and its own
    // header comment for why). Already excluded from tsc/next build;
    // excluded here too so `npx eslint .` gives a truthful signal
    // instead of parser errors on intentionally-commented-out code.
    "src/data/full-plan-patch.ts",
  ]),
]);

export default eslintConfig;
