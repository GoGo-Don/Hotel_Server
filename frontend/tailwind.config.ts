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
          50:  '#FFF8F0',
          100: '#FFE8C7',
          200: '#FFCF8A',
          300: '#FFB347',
          400: '#E8940A',
          500: '#CC7A08',
          600: '#A86306',
          700: '#7A4804',
          800: '#4F2F02',
          900: '#2B1800',
        },
        teal: {
          DEFAULT: '#007A63',
          50:  '#E6F4F1',
          100: '#CCECE6',
          500: '#007A63',
          600: '#006452',
          700: '#004D3E',
        },
      },
    },
  },
  plugins: [],
};

export default config;
