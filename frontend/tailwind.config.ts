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
          50:  "#fdf8f0",
          100: "#faefd9",
          500: "#c9973a",
          600: "#b5832a",
          700: "#8f6420",
          900: "#3d2a0c",
        },
      },
    },
  },
  plugins: [],
};

export default config;
