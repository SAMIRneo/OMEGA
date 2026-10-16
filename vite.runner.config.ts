import {defineConfig} from 'vite';
export default defineConfig({build:{ssr:'runner/server.ts',outDir:'runner-dist',emptyOutDir:true,target:'node22',rollupOptions:{output:{entryFileNames:'server.mjs'}}}});
