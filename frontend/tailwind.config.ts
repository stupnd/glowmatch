import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        plum: {
          DEFAULT: "#6B2D5E",
          dark: "#542449",
        },
        flare: {
          DEFAULT: "#E8829A",
          dark: "#D96B84",
        },
        mauve: "#C9A0B4",
        blush: "#F7E8EF",
        berry: "#2D0A20",
        canvas: "#FDFAFA",
      },
      fontFamily: {
        display: ["var(--font-playfair)", "Georgia", "serif"],
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "1rem",
      },
      boxShadow: {
        rose: "0 18px 40px -12px rgba(232, 130, 154, 0.45), 0 8px 16px -8px rgba(107, 45, 94, 0.12)",
        plum: "0 18px 40px -12px rgba(107, 45, 94, 0.38), 0 8px 16px -8px rgba(45, 10, 32, 0.18)",
        soft: "0 12px 32px -8px rgba(45, 10, 32, 0.08)",
      },
      backgroundImage: {
        "gradient-brand": "linear-gradient(135deg, #6B2D5E 0%, #E8829A 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
