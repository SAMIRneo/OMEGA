import { defineConfig } from 'vitest/config';
export default defineConfig({ root: 'frontend', base: './', publicDir: false, build: { outDir: '../dist', emptyOutDir: true, target: 'es2020', sourcemap: false }, test: { include: ['**/*.test.ts'], environment: 'node' } });
