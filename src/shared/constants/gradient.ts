import { colors } from "./colors";

// src/shared/config/gradients.ts
export const gradients = {
  primary: {
    colors: [colors.brand.primary, colors.brand.light] as const,
    start: { x: 0, y: 0 },
    end: { x: 1, y: 2 },
  },
  disabled: {
    colors: [colors.outline, colors.outline] as const,
    start: { x: 0, y: 0 },
    end: { x: 1, y: 2 },
  },
} as const;
