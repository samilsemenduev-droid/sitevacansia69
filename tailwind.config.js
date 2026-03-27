import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    path.join(__dirname, 'index.html'),
    path.join(__dirname, 'src/**/*.{js,ts,jsx,tsx}'),
    path.join(__dirname, 'src/**/*.css'),
  ],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--color-canvas)',
        surface: 'var(--color-surface)',
        card: 'var(--color-card)',
        elevated: 'var(--color-elevated)',
        input: 'var(--color-input)',
        line: 'var(--color-line)',
        ink: {
          DEFAULT: 'var(--color-ink)',
          muted: 'var(--color-ink-muted)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
          muted: 'rgb(109 124 255 / 0.14)',
        },
        danger: 'var(--color-danger)',
        success: 'var(--color-success)',
        dup: {
          bg: 'var(--color-dup-bg)',
          row: 'var(--color-dup-row)',
        },
      },
      fontFamily: {
        sans: [
          'Plus Jakarta Sans',
          'Inter',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      boxShadow: {
        soft: 'var(--shadow-float)',
        card: 'var(--shadow-card)',
        glow: '0 0 0 1px rgb(109 124 255 / 0.2), 0 8px 32px -10px rgb(109 124 255 / 0.35)',
        'inner-input': 'inset 0 1px 0 rgb(255 255 255 / 0.04)',
      },
      transitionDuration: {
        ui: 'var(--duration-ui)',
      },
      transitionTimingFunction: {
        out: 'var(--ease-out)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s var(--ease-out) forwards',
        'toast-in': 'toastIn 0.22s var(--ease-out) forwards',
        'row-in': 'rowIn 0.18s var(--ease-out) forwards',
        'menu-in': 'menuIn 0.14s var(--ease-out) forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        toastIn: {
          '0%': { opacity: '0', transform: 'translateY(10px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        rowIn: {
          '0%': { opacity: '0.75' },
          '100%': { opacity: '1' },
        },
        menuIn: {
          '0%': { opacity: '0', transform: 'scale(0.96) translateY(-4px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
