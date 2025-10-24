import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Map CSS variables to Tailwind colors
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
          foreground: 'var(--color-primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--color-secondary)',
          foreground: 'var(--color-cream)',
        },
        background: 'var(--color-background)',
        foreground: 'var(--color-foreground)',
        accent: {
          DEFAULT: 'var(--color-accent)',
          foreground: 'var(--color-cream)',
        },
        destructive: {
          DEFAULT: 'var(--color-danger)',
          foreground: 'var(--color-cream)',
        },
        // Additional semantic colors for button component
        ring: 'var(--color-moss)',
      },
    },
  },
};

export default config;
