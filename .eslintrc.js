// .eslintrc.js
module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true,
    browser: true, // Add this
  },
  extends: [
    "eslint:recommended",
    "plugin:react/recommended", // Add this
    "plugin:react/jsx-runtime", // Add this
    "plugin:prettier/recommended",
  ],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: {
      // Add this section
      jsx: true,
    },
  },
  plugins: ["prettier", "react"], // Add react
  settings: {
    // Add this section
    react: {
      version: "detect",
    },
  },
  rules: {
    "prettier/prettier": "error",
    "no-console": "warn",
    "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "no-process-exit": "error",
    "no-throw-literal": "error",
    "prefer-const": "error",
    "no-var": "error",
  },
};
