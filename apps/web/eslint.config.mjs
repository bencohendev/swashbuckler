import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import jsxA11y from "eslint-plugin-jsx-a11y";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Upgrade jsx-a11y rules to recommended (plugin already registered by eslint-config-next)
  {
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
      // autoFocus in dialogs/modals is intentional and correct for focus management
      'jsx-a11y/no-autofocus': 'off',
      // Allow nested label text (e.g., label wrapping a div with text content)
      'jsx-a11y/label-has-associated-control': ['error', { depth: 3 }],
    },
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
