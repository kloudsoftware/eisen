import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts', 'src/vite-plugin.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    target: 'es2017',
    treeshake: true,
    splitting: false,
    platform: 'browser',
    minify: true,
    outExtension: ({ format }) => ({ js: format === 'esm' ? '.mjs' : '.cjs' }),
    external: ['typescript'],
});
