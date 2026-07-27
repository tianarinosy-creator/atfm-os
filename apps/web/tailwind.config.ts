import type { Config } from "tailwindcss";
import { colors } from "@atfm/ui";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: colors.bg,
        surface: colors.surface,
        "surface-alt": colors.surfaceAlt,
        ink: colors.ink,
        "ink-soft": colors.inkSoft,
        border: colors.border,
        "blue-deep": colors.blueDeep,
        violet: colors.violet,
        success: colors.success,
        danger: colors.danger,
        warning: colors.warning,
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        atfm: "10px",
      },
    },
  },
  plugins: [],
};

export default config;
