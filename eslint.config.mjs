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
  ]),
  {
    // The WebGL experience mutates Three.js objects inside useFrame render
    // loops — that's the idiomatic react-three-fiber pattern, but the React
    // Compiler lint rules (written for React render functions) flag it.
    files: ["src/experience/**/*.{ts,tsx}"],
    rules: {
      "react-hooks/purity": "off",
      "react-hooks/immutability": "off",
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
      // /?classic must be a full page load so the gate re-evaluates
      "@next/next/no-html-link-for-pages": "off",
    },
  },
]);

export default eslintConfig;
