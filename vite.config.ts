import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // In dev, /api goes to `npm run dev:worker` (wrangler's default port).
    proxy: { '/api': 'http://127.0.0.1:8787' },
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
