import path from "node:path";

import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

import { ROOT_DIR } from "./architecture.manifest.mjs";
import { localPlugin } from "./eslint-rules/index.mjs";

const ROOT = import.meta.dirname;

export default tseslint.config([
  {
    ignores: [
      "**/dist/**", "**/build/**", "**/coverage/**", "**/node_modules/**", "**/*.d.ts",
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,

  // 설정과 검사 스크립트는 어떤 tsconfig에도 없으므로 타입 정보를 만들 수 없다.
  {
    files: ["**/*.{js,cjs,mjs}"],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: { globals: { ...globals.node } },
  },

  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: ROOT },
      globals: { ...globals.browser },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/no-unnecessary-condition": "error",
      "@typescript-eslint/return-await": "error",
      "@typescript-eslint/no-unused-vars": ["error", {
        varsIgnorePattern: "^_",
        argsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      }],
    },
  },

  {
    files: [`${ROOT_DIR}/**/*.{ts,tsx}`],
    plugins: { local: localPlugin },
    rules: {
      "local/require-js-extension": "error",
      "local/no-deep-relative-import": ["error", { aliases: { "~": path.join(ROOT, ROOT_DIR) } }],
      "local/prefer-barrel-index": ["error", { aliases: { "~": path.join(ROOT, ROOT_DIR) } }],
    },
  },

  {
    files: [`${ROOT_DIR}/**/*.{ts,tsx}`, "scripts/**/*.mjs", "eslint-rules/**/*.mjs", "*.mjs"],
    plugins: { local: localPlugin },
    rules: { "local/comment-language": "error" },
  },

  {
    files: ["**/*.test.{ts,tsx,mjs}"],
    plugins: { local: localPlugin },
    rules: {
      "local/korean-test-title": "error",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-misused-promises": "off",
      "@typescript-eslint/require-await": "off",
    },
  },
]);
