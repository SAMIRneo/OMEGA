import { defineConfig } from 'vite';
// SDK schemas must initialize before their dependent lazy chunks execute.
export default defineConfig({ root: 'frontend', base: './', publicDir: false, build: { outDir: '../dist', emptyOutDir: true, target: 'es2020', sourcemap: false, rolldownOptions: {output: {strictExecutionOrder:true}} } });
