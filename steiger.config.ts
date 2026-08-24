import fsd from "@feature-sliced/steiger-plugin";
import { defineConfig } from "steiger";

export default defineConfig([
  ...fsd.configs.recommended,
  {
    rules: {
      "fsd/forbidden-imports": "warn",
      "fsd/no-public-api-sidestep": "warn",
      "fsd/inconsistent-naming": "warn",
      "fsd/insignificant-slice": "warn",
      "fsd/segments-by-purpose": "warn",
    },
  },
  {
    files: ["./src/**/__tests__/**"],
    rules: {
      "fsd/forbidden-imports": "off",
      "fsd/no-public-api-sidestep": "off",
    },
  },
]);
