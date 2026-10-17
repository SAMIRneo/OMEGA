import {defineConfig} from 'vitest/config';

// Discover tests in their owning runtime without changing the web build root.
export default defineConfig({test:{include:['frontend/**/*.test.ts','shared/**/*.test.ts','runner/**/*.test.ts'],environment:'node'}});
