import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@monorepo/core': path.resolve(__dirname, '../../packages/core/src'),
      '@monorepo/utils': path.resolve(__dirname, '../../packages/utils/src'),
      '@monorepo/components': path.resolve(__dirname, '../../packages/components/src'),
    },
  },
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
