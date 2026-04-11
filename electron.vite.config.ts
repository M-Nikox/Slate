import { defineConfig } from 'electron-vite';
import path from 'node:path';
import react from '@vitejs/plugin-react';

export default defineConfig({
  main: {
    build: {
      outDir: 'out/main',
      emptyOutDir: true,
      rollupOptions: {
        external: [
          'electron',
          'electron/main',
          'path',
          'fs',
          'os',
          'url',
          'semver',
          'electron-updater'
        ],
      },
    },
  },
  preload: {
    build: {
      outDir: 'out/preload',
      emptyOutDir: true,
      rollupOptions: {
        input: {
          index: path.resolve(__dirname, 'src/preload/preload.ts'),
        },
        external: ['electron', 'electron/renderer'],
        output: {
          format: 'cjs',
          entryFileNames: '[name].cjs',
          chunkFileNames: '[name].cjs',
          assetFileNames: '[name].[extname]',
        },
      },
    },
  },
  renderer: {
    base: './',
    plugins: [react()],
    build: {
      outDir: path.resolve(__dirname, 'out/renderer'),
      emptyOutDir: true,
      rollupOptions: {
        input: path.resolve(__dirname, 'src/renderer/index.html'),
      },
    },
  },
});