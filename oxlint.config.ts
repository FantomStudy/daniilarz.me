import { defineConfig } from "oxlint";

export default defineConfig({
  plugins: ["react", "typescript", "oxc", "import"],
  categories: {
    correctness: "error",
    suspicious: "warn",
  },
  options: {
    typeAware: true,
  },
  rules: {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["off", { allowConstantExport: true }],
    "react/react-in-jsx-scope": "off",
    "react/exhaustive-deps": "off",
    "import/no-cycle": "error",
    "import/no-duplicates": "error",
    "import/no-unassigned-import": "off",
    "no-underscore-dangle": ["warn", { allow: ["_splat"] }],
  },
});
