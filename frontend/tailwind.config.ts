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
        sans: ['var(--font-inter)', 'Inter', 'sans-serif'],
        title: ['var(--font-poppins)', 'Poppins', 'sans-serif'],
      },
      borderRadius: {
        input: '6px',
        btn: '6px',
        card: '8px',
        modal: '14px',
      },
      boxShadow: {
        card: '0 2px 8px rgba(0, 0, 0, 0.08)',
        'card-hover': '0 8px 16px rgba(0, 0, 0, 0.12)',
      },
      backgroundImage: {
        'brand-rainbow': 'linear-gradient(90deg, #0877E8 0%, #41BF5A 35%, #FFC107 70%, #E63946 100%)',
      },
    },
  },
  plugins: [],
};

export default config;
