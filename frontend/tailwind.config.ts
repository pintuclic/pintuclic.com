import type { Config } from 'tailwindcss';
import { PINTUCLIC_COLORS } from './src/core/theme/colors';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: PINTUCLIC_COLORS,
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        title: ['Poppins', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
