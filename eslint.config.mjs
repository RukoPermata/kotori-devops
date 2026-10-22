import nextPlugin from "@next/eslint-plugin-next";
import tsParser from "@typescript-eslint/parser";
import reactHooksPlugin from "eslint-plugin-react-hooks";

export default [
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      "react-hooks": reactHooksPlugin,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    ...nextPlugin.configs["core-web-vitals"],
    files: ["**/*.{js,jsx,ts,tsx,mjs}"],
  },
  {
    ignores: [
      ".next/**",
      "out/**",
      "node_modules/**",
      "reference/**",
      "test-translate.mjs",
      "scripts/**",
    ],
  },
];
