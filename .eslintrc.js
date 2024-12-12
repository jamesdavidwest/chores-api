// .eslintrc.js
module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true,
  },
  extends: ["eslint:recommended", "plugin:prettier/recommended"],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  plugins: ["prettier"],
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
