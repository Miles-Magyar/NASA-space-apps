import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        bypass(req) {
          // During plain `vite` without a local API server, let the client
          // fall through to its corpus-backed offline path.
          if (req.url?.startsWith('/api')) return req.url;
        },
      },
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
