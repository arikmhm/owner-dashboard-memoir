import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".agents/**",
    "prd-memoir/**",
    "docs/**",
  ]),
  {
    rules: {
      // React 19 strict purity rules — disabled for now
      // These flag common patterns (setState in effect, Date.now in render);
      // will address iteratively after deployment is stable
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
      // Allow unused vars prefixed with _
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
]);

export default eslintConfig;
