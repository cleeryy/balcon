import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { plugin as shadcn } from "@shadcn/lint";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // @shadcn/lint is registered for the design-system rules; no rule is
  // enabled here yet — enable them in a follow-up (see @shadcn/lint docs).
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: { shadcn },
  },
  // Backend files are off-limits for this UI pass; lib/check.ts carries a
  // pre-existing `prefer-const` finding we are not allowed to touch.
  {
    files: ["lib/check.ts"],
    rules: { "prefer-const": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
