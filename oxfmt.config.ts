import { defineConfig } from "oxfmt";

export default defineConfig({
  sortImports: {
    groups: [
      "type-import",
      ["type-parent", "type-sibling", "type-index", "type-internal"],
      "value-builtin",
      "value-external",
      ["value-internal", "value-subpath"],
      ["value-parent", "value-sibling", "value-index"],
      "side_effect",
      "style",
      "side_effect_style",
      "unknown",
    ],
    newlinesBetween: false,
  },
});
