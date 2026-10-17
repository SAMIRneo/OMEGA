import { defineConfig } from 'vite';
export default defineConfig({ root: 'frontend', base: './', publicDir: false, build: { outDir: '../dist', emptyOutDir: true, target: 'es2020', sourcemap: false } });
