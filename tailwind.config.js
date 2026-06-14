/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "var(--canvas)",
        panel: "var(--panel)",
        "panel-solid": "var(--panel-solid)",
        aside: "var(--aside)",
        elevated: "var(--elevated)",
        hairline: "var(--hairline)",
        ink: "var(--ink)",
        "ink-muted": "var(--ink-muted)",
        "ink-subtle": "var(--ink-subtle)",
        accent: "var(--accent)",
        "accent-hover": "var(--accent-hover)",
        "accent-soft": "var(--accent-soft)",
        "accent-ring": "var(--accent-ring)",
        titanium: "var(--titanium)",
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
        "danger-soft": "var(--danger-soft)",
      },
      fontFamily: {
        sans: ["Hanken Grotesk", "system-ui", "-apple-system", "sans-serif"],
        serif: ["EB Garamond", "Georgia", "Cambria", "Times New Roman", "serif"],
      },
      letterSpacing: {
        caps: "0.1em",
      },
      fontSize: {
        reading: ["19px", { lineHeight: "1.68" }],
      },
      borderRadius: {
        lg: "0.75rem",
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        // Tactile relief language from the Lex Lux theme
        tactile: "0 2px 4px rgba(2,12,24,0.10), inset 0 1px 0 rgba(255,255,255,0.12)",
        "tactile-pressed": "inset 0 2px 4px rgba(2,12,24,0.22)",
        card: "0 4px 12px rgba(2,12,24,0.05)",
        float: "0 10px 25px -5px rgba(2,12,24,0.10), 0 4px 10px -4px rgba(2,12,24,0.06)",
        glass: "0 8px 40px rgba(0, 0, 0, 0.45)",
      },
      transitionTimingFunction: {
        "out-soft": "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-left": {
          from: { opacity: "0", transform: "translateX(-12px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        shimmer: { "100%": { transform: "translateX(100%)" } },
        "dot-pulse": {
          "0%, 80%, 100%": { opacity: "0.25", transform: "scale(0.8)" },
          "40%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out both",
        "slide-up": "slide-up 0.28s cubic-bezier(0.22, 1, 0.36, 1) both",
        "slide-in-left": "slide-in-left 0.3s cubic-bezier(0.22, 1, 0.36, 1) both",
        "scale-in": "scale-in 0.2s cubic-bezier(0.22, 1, 0.36, 1) both",
      },
    },
  },
  plugins: [],
};
