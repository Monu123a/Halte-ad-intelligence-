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
        bg: "var(--bg)",
        card: "var(--card)",
        ink: {
          DEFAULT: "var(--ink)",
          soft: "var(--ink-soft)",
        },
        green: {
          DEFAULT: "var(--green)",
          tint: "var(--green-tint)",
        },
        amber: {
          DEFAULT: "var(--amber)",
          tint: "var(--amber-tint)",
        },
        slate: {
          DEFAULT: "var(--slate)",
          tint: "var(--slate-tint)",
        },
        rust: {
          DEFAULT: "var(--rust)",
          tint: "var(--rust-tint)",
        },
        stone: {
          DEFAULT: "var(--stone)",
          dark: "var(--stone-dark)",
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
        serif: ['var(--font-newsreader)', 'serif'],
      },
      borderRadius: {
        DEFAULT: '8px',
        md: '8px',
        lg: '10px',
      },
      boxShadow: {
        // Remove all shadows per PRD
        sm: 'none',
        DEFAULT: 'none',
        md: 'none',
        lg: 'none',
        xl: 'none',
        '2xl': 'none',
        inner: 'none',
      }
    },
  },
  plugins: [],
};
export default config;
