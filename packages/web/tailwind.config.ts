import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="terminal"]'],
  content: [
    "./src/pages/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/app/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ["IBM Plex Mono", "JetBrains Mono", "Source Code Pro", "monospace"],
      },
      colors: {
        // Terminal Theme (Default)
        terminal: {
          bg: {
            primary: "#000000",
            secondary: "#111111",
            accent: "#1a1a1a",
            hover: "#222222",
          },
          text: {
            primary: "#00ff00",
            secondary: "#00aa00",
            muted: "#008000",
            inverse: "#000000",
          },
          border: {
            primary: "#00ff00",
            secondary: "#008000",
          },
        },
        // Amber CRT Theme
        amber: {
          bg: { primary: "#0a0a0a", secondary: "#1a1000", accent: "#2a1a00" },
          text: { primary: "#ffb000", secondary: "#cc8800", muted: "#996600" },
          border: { primary: "#ffb000", secondary: "#cc8800" },
        },
        // IBM Blue Theme
        ibm: {
          bg: { primary: "#000080", secondary: "#0000aa", accent: "#1010cc" },
          text: { primary: "#ffffff", secondary: "#cccccc", muted: "#999999" },
          border: { primary: "#ffffff", secondary: "#cccccc" },
        },
        // Semantic Colors (Prediction Market)
        prediction: {
          bullish: "#00ff00",
          bearish: "#ff0000",
          neutral: "#888888",
        },
        // Confidence level colors
        confidence: {
          high: "#00ff00",    // 80%+
          medium: "#ffff00",  // 60-79%
          low: "#ffa500",     // 40-59%
          vlow: "#ff0000",    // <40%
        },
        // Kelly criterion colors
        kelly: {
          optimal: "#00ffff",
          conservative: "#00aa00",
          aggressive: "#ff8800",
          warning: "#ff0000",
        },
        // Superforecaster tier colors
        tier: {
          apprentice: "#888888",   // Gray - seedling
          journeyman: "#cd7f32",   // Bronze - target
          expert: "#c0c0c0",       // Silver - crystal ball
          master: "#ffd700",       // Gold - brain
          grandmaster: "#00ffff",  // Cyan - all-seeing eye
        },
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "1rem" }],    // 10px
        xs: ["0.75rem", { lineHeight: "1rem" }],        // 12px
        sm: ["0.875rem", { lineHeight: "1.25rem" }],    // 14px
        base: ["1rem", { lineHeight: "1.5rem" }],       // 16px
        lg: ["1.125rem", { lineHeight: "1.75rem" }],    // 18px
        xl: ["1.25rem", { lineHeight: "1.75rem" }],     // 20px
        "2xl": ["1.5rem", { lineHeight: "2rem" }],      // 24px
      },
      boxShadow: {
        "terminal-glow": "0 0 10px rgba(0, 255, 0, 0.3)",
        "amber-glow": "0 0 10px rgba(255, 176, 0, 0.3)",
        "ibm-glow": "0 0 10px rgba(255, 255, 255, 0.3)",
      },
      borderRadius: {
        none: "0",
      },
      animation: {
        "cursor-blink": "cursor-blink 1s step-end infinite",
        "scanline": "scanline 8s linear infinite",
      },
      keyframes: {
        "cursor-blink": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        "scanline": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
