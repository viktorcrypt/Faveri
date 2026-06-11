import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', "Geist", "Satoshi", "Avenir Next", "system-ui", "sans-serif"],
        sans: ["Geist", "Satoshi", "Avenir Next", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', '"SFMono-Regular"', "Consolas", "monospace"]
      },
      colors: {
        ink: {
          50: "#fbfaf4",
          100: "#edf5e8",
          300: "#8bc49b",
          500: "#4e8f65",
          700: "#2f6545",
          950: "#171714"
        },
        steel: {
          900: "#111718",
          800: "#172021",
          700: "#263031"
        }
      },
      boxShadow: {
        glow: "0 1px 0 rgba(255,255,255,0.8) inset, 0 28px 80px -58px rgba(44,38,28,0.48)"
      }
    }
  },
  plugins: []
};

export default config;
