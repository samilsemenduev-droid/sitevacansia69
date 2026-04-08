import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

import { cloudflare } from "@cloudflare/vite-plugin";

/**
 * base: '/' — корень сайта на Cloudflare Pages (*.pages.dev и свой домен без подпути).
 * Сборка даёт пути вида /assets/*.js; если указать base: './' или подпапку без
 * совпадения с реальным URL, браузер запросит неверные URL и получит index.html → MIME text/html.
 */
export default defineConfig({
  plugins: [react(), cloudflare()],
  base: '/',
  build: {
    outDir: 'dist',
  },
});