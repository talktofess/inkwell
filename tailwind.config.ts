import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        serif: ["Georgia", "Cambria", "Times New Roman", "serif"],
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      colors: {
        ink: {
          bg: "rgb(var(--ink-bg) / <alpha-value>)",
          surface: "rgb(var(--ink-surface) / <alpha-value>)",
          raised: "rgb(var(--ink-raised) / <alpha-value>)",
          border: "rgb(var(--ink-border) / <alpha-value>)",
          text: "rgb(var(--ink-text) / <alpha-value>)",
          muted: "rgb(var(--ink-muted) / <alpha-value>)",
          accent: "rgb(var(--ink-accent) / <alpha-value>)",
          accentSoft: "rgb(var(--ink-accent-soft) / <alpha-value>)",
        },
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.18s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
