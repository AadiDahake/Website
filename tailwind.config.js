/* Tailwind keeps its utilities for layout plumbing only.
   assets/css/main.css owns the design system: tokens, reset, components.
   The old brand gradients are deliberately gone — the palette is tokens now. */
module.exports = {
  darkMode: "class",
  content: [
    "components/**/*.vue",
    "layouts/**/*.vue",
    "pages/**/*.vue",
    "composables/**/*.{js,ts}",
    "plugins/**/*.{js,ts}",
    "App.{js,ts,vue}",
    "app.{js,ts,vue}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        "bg-2": "var(--bg-2)",
        "bg-3": "var(--bg-3)",
        line: "var(--line)",
        fg: "var(--fg)",
        "fg-soft": "var(--fg-soft)",
        dim: "var(--dim)",
        accent: "var(--accent)",
      },
      fontFamily: {
        sans: ["Inter Variable", "Inter", "system-ui", "sans-serif"],
        mono: ["DM Mono", "ui-monospace", "monospace"],
      },
      animation: {
        "spin-slow": "spin 10s linear infinite",
      },
    },
  },
  plugins: [
    require("@headlessui/tailwindcss"),
  ],
};
