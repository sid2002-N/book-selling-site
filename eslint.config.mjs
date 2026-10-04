import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import importPlugin from "eslint-plugin-import";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    plugins: { import: importPlugin },
    rules: {
      "import/no-cycle": "error",
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
  },
  {
    // Layer rule (docs/ARCHITECTURE.md §5): UI never touches the database or module internals.
    files: ["src/components/**/*.{ts,tsx}", "src/app/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@/lib/db", "@/lib/db/*"], message: "Components must go through module services." },
            { group: ["@/modules/*/*"], message: "Import modules only through their index (public API)." },
            { group: ["@prisma/client", "@/generated/*"], message: "No database client in UI code." },
          ],
        },
      ],
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "UIUX/**", "prompt-doc/**", "src/generated/**"]),
]);

export default eslintConfig;
