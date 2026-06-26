import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#faf7f2",       // Warm background
          100: "#f0e8d8",      // Warm card background
          200: "#e3d4bc",      // Warm border
          300: "#b09870",      // Faint
          400: "#7a6145",      // Muted
          500: "#c17c2e",      // Amber (Primary)
          600: "#9e6020",      // Amber dark (Primary Hover)
          900: "#1c1309",      // Dark wood text
        },
        indigo: {
          50: "#faf7f2",
          100: "#f0e8d8",
          200: "#e3d4bc",
          300: "#b09870",
          400: "#7a6145",
          500: "#c17c2e",
          600: "#c17c2e",
          700: "#9e6020",
          800: "#7c4613",
          900: "#1c1309",
        },
      },
      fontFamily: {
        sans: ["var(--font-manrope)", "sans-serif"],
        heading: ["var(--font-outfit)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
