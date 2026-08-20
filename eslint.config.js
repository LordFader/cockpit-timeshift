"use strict";

const globals = require("globals");

module.exports = [
  {
    ignores: ["node_modules/**"]
  },
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        ...globals.browser,
        ...globals.node,
        cockpit: "readonly"
      }
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": ["error", { varsIgnorePattern: "^_" }],
      "no-unreachable": "error",
      "no-constant-condition": "error",
      "no-dupe-args": "error",
      "no-dupe-keys": "error",
      "no-cond-assign": "error",
      "no-func-assign": "error",
      "no-redeclare": "error",
      "no-unexpected-multiline": "error",
      "no-fallthrough": "error",
      "no-extra-semi": "error",
      "no-eval": "error",
      "no-unsafe-negation": "error",
      "eqeqeq": ["error", "always"],
      "radix": "error"
    }
  }
];